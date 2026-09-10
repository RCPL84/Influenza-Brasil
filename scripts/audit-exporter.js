#!/usr/bin/env node
// scripts/audit-exporter.js
// Reliable Redis consumer-group exporter that pushes audit:events to Loki (batched) and exposes Prometheus metrics.

import Redis from 'ioredis';
import fetch from 'node-fetch';
import express from 'express';
import client from 'prom-client';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100/loki/api/v1/push';
const GROUP = process.env.REDIS_CONSUMER_GROUP || 'audit_exporters';
const CONSUMER = process.env.CONSUMER_NAME || `audit-exporter-${Math.random().toString(36).slice(2,8)}`;
const POLL_MS = Number(process.env.POLL_MS || 5000);
const PORT = Number(process.env.PORT || 9400);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 50);
const LOKI_RETRY = Number(process.env.LOKI_RETRY || 5);

const redis = new Redis(REDIS_URL);

// Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const auditCounter = new client.Counter({ name: 'audit_events_total', help: 'Total audit events processed', labelNames: ['action'] });
const auditByKey = new client.Counter({ name: 'audit_events_by_key_total', help: 'Audit events processed per key', labelNames: ['keyId'] });

function fieldsToObj(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i+1];
  return obj;
}

function nowNanos(tsMs) {
  return `${BigInt(tsMs) * 1000000n}`;
}

async function pushBatchToLoki(entries) {
  if (!entries || entries.length === 0) return;
  // Build a single stream with job=audits and multiple values (each value is [timestamp, json])
  const values = entries.map(e => [nowNanos(e._processedAt), JSON.stringify(e)]);
  const body = { streams: [ { stream: { job: 'audits' }, values } ] };

  let attempt = 0;
  while (attempt < LOKI_RETRY) {
    try {
      const res = await fetch(LOKI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Loki responded ${res.status}`);
      return;
    } catch (e) {
      attempt++;
      const backoff = Math.min(30000, 500 * Math.pow(2, attempt));
      console.warn(`Loki push failed (attempt ${attempt}): ${e.message}. Backing off ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  console.error('Failed to push batch to Loki after retries');
}

async function processEntriesBatch(entries) {
  // entries: [ [id, [f,v,...]], ... ]
  const processed = [];
  for (const e of entries) {
    const id = e[0];
    const fields = e[1];
    const obj = fieldsToObj(fields);
    obj._id = id;
    obj._processedAt = Date.now();
    processed.push(obj);

    // increment prom metrics
    if (obj.action) auditCounter.inc({ action: obj.action }, 1);
    if (obj.keyId) auditByKey.inc({ keyId: obj.keyId }, 1);
  }

  // push to Loki in one batch
  await pushBatchToLoki(processed);

  // acknowledge in redis
  try {
    const ids = processed.map(p => p._id);
    if (ids.length > 0) await redis.xack('audit:events', GROUP, ...ids);
  } catch (e) {
    console.warn('Failed to XACK entries', e.message || e);
  }
}

async function ensureGroup() {
  try {
    // Create group if not exists; MKSTREAM creates stream if missing
    await redis.xgroup('CREATE', 'audit:events', GROUP, '$', 'MKSTREAM');
    console.log('Created consumer group', GROUP);
  } catch (e) {
    if (String(e).includes('BUSYGROUP')) {
      console.log('Consumer group already exists');
    } else {
      console.warn('xgroup create error', e.message || e);
    }
  }
}

async function consumerLoop() {
  const batch = BATCH_SIZE;
  while (true) {
    try {
      // Read new messages via XREADGROUP; '>' gets new messages not yet delivered to other consumers
      const res = await redis.xreadgroup('GROUP', GROUP, CONSUMER, 'COUNT', batch, 'BLOCK', POLL_MS, 'STREAMS', 'audit:events', '>');
      if (!res) {
        // no new messages in the block window, but we should also check for pending entries older than a threshold
        // Claim any stale pending messages (IDLE > 1m) using XAUTOCLAIM (Redis >= 6.2)
        try {
          const idleMs = 60 * 1000; // 1 minute
          const claimRes = await redis.xautoclaim('audit:events', GROUP, CONSUMER, idleMs, '0-0', 'COUNT', batch);
          // claimRes: [nextId, [[id, [f,v...]], ...]]
          const claimed = claimRes && claimRes[1] ? claimRes[1] : [];
          if (claimed.length > 0) {
            await processEntriesBatch(claimed);
          }
        } catch (e) {
          // xautoclaim might not be supported in older Redis or ioredis wrapper; ignore failures
        }
        continue;
      }
      // res format: [ [ 'audit:events', [ [id, [f,v,...] ], ... ] ] ]
      for (const streamEntry of res) {
        const entries = streamEntry[1];
        if (entries && entries.length > 0) {
          await processEntriesBatch(entries);
        }
      }
    } catch (e) {
      console.error('consumerLoop error', e && e.message ? e.message : e);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// HTTP metrics
const app = express();
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (e) {
    res.status(500).end(String(e));
  }
});

app.listen(PORT, async () => {
  console.log(`audit-exporter: metrics available at http://0.0.0.0:${PORT}/metrics`);
  await ensureGroup();
  consumerLoop().catch(err => {
    console.error('consumerLoop fatal', err);
    process.exit(1);
  });
});
