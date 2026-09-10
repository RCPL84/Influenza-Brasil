#!/usr/bin/env node
// scripts/audit-exporter.js
import Redis from 'ioredis';
import fetch from 'node-fetch';
import express from 'express';
import client from 'prom-client';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100/loki/api/v1/push';
const POLL_MS = Number(process.env.POLL_MS || 2000);
const PORT = Number(process.env.PORT || 9400);

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

async function pushToLoki(obj) {
  try {
    const ts = `${BigInt(Date.now()) * 1000000n}`;
    const stream = { stream: { job: 'audits', action: obj.action || 'unknown', keyId: obj.keyId || 'none' }, values: [[ts, JSON.stringify(obj)]] };
    const body = { streams: [stream] };
    await fetch(LOKI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) {
    console.warn('Loki push failed', e?.message || e);
  }
}

async function processEntry(entry) {
  const id = entry[0];
  const fields = entry[1];
  const obj = fieldsToObj(fields);
  obj._id = id;
  obj._processedAt = Date.now();
  await pushToLoki(obj);
  if (obj.action) auditCounter.inc({ action: obj.action }, 1);
  if (obj.keyId) auditByKey.inc({ keyId: obj.keyId }, 1);
}

async function pollLoop() {
  let lastId = '$';
  while (true) {
    try {
      const res = await redis.xread('BLOCK', POLL_MS, 'STREAMS', 'audit:events', lastId);
      if (!res) continue;
      for (const streamEntry of res) {
        const entries = streamEntry[1];
        for (const e of entries) {
          await processEntry(e);
          lastId = e[0];
        }
      }
    } catch (e) {
      console.error('pollLoop error', e && e.message ? e.message : e);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

const app = express();
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (e) {
    res.status(500).end(e.message);
  }
});

app.listen(PORT, () => {
  console.log(`audit-exporter: metrics available at http://0.0.0.0:${PORT}/metrics`);
  pollLoop().catch(err => {
    console.error('pollLoop fatal error', err);
    process.exit(1);
  });
});
