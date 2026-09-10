import express from 'express';
import { Server } from 'http';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { GoogleGenAI } from '@google/genai';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

// CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,x-admin-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Config
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const DEFAULT_KEY_QUOTA = Number(process.env.DEFAULT_KEY_QUOTA) || 60;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || '';
const APP_JWT_EXP = Number(process.env.APP_JWT_EXP_SECONDS) || 3600;
const REQUIRE_APP_KEY = process.env.REQUIRE_APP_KEY === 'true';

// Redis client
const redis = new Redis(REDIS_URL);
redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

// Metrics helper
async function incrMetric(name: string) {
  try {
    await redis.incr(`metrics:${name}`);
  } catch (e) {
    logger.warn({ err: e }, 'Failed to increment metric');
  }
}

// App key helpers (stored as hash: appkey:{key})
async function createAppKey(quota = DEFAULT_KEY_QUOTA) {
  const id = uuidv4();
  const key = uuidv4();
  const now = Date.now();
  const redisKey = `appkey:${key}`;
  await redis.hset(redisKey, {
    id,
    key,
    active: '1',
    quota: String(quota),
    createdAt: String(now)
  });
  await redis.hset(`appkey_by_id:${id}`, { key });
  return { id, key, quota, createdAt: now };
}

async function getAppKeyDataByKey(key: string) {
  const redisKey = `appkey:${key}`;
  const data = await redis.hgetall(redisKey);
  if (!data || Object.keys(data).length === 0) return null;
  return {
    id: data.id,
    key: data.key,
    active: data.active === '1',
    quota: Number(data.quota || DEFAULT_KEY_QUOTA),
    createdAt: Number(data.createdAt || 0)
  };
}

async function getAppKeyDataById(id: string) {
  const lookup = await redis.hgetall(`appkey_by_id:${id}`);
  if (!lookup || !lookup.key) return null;
  return getAppKeyDataByKey(lookup.key);
}

async function revokeAppKeyByKey(key: string) {
  const redisKey = `appkey:${key}`;
  await redis.hset(redisKey, 'active', '0');
  await incrMetric('admin_keys_revoked');
}

// Admin auth middleware
function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const provided = req.header('x-admin-secret') || '';
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Auth middleware (x-api-key or Bearer JWT)
async function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!REQUIRE_APP_KEY && !ADMIN_SECRET && !process.env.APP_API_KEYS) return next();

  const headerKey = req.header('x-api-key');
  const authHeader = req.header('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  let keyData: any = null;

  if (headerKey) keyData = await getAppKeyDataByKey(headerKey);
  else if (bearer) {
    try {
      if (!APP_JWT_SECRET) throw new Error('APP_JWT_SECRET not configured');
      const payload = jwt.verify(bearer, APP_JWT_SECRET) as any;
      keyData = await getAppKeyDataById(String(payload.sub));
    } catch (err) {
      logger.warn({ err }, 'JWT verification failed');
      await incrMetric('auth_failures');
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  if (!keyData) {
    await incrMetric('auth_failures');
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }
  if (!keyData.active) {
    await incrMetric('auth_failures');
    return res.status(403).json({ error: 'API key revoked' });
  }

  (req as any).clientKey = keyData;
  next();
}

// Rate limiter using per-key counters (Redis)
async function keyRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const client = (req as any).clientKey;
  const quota = client?.quota ?? DEFAULT_KEY_QUOTA;
  const windowSec = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  const idForCounter = client ? `key:${client.id}` : `ip:${req.ip}`;
  const counterKey = `rl:${idForCounter}`;

  try {
    const current = await redis.incr(counterKey);
    if (current === 1) await redis.expire(counterKey, windowSec);
    const remaining = Math.max(0, quota - Number(current));
    res.setHeader('X-RateLimit-Limit', String(quota));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (Number(current) > quota) {
      const ttl = await redis.ttl(counterKey);
      await incrMetric('throttle_events');
      if (client) await incrMetric(`throttle_key_${client.id}`);
      logger.warn({ clientId: client?.id, ip: req.ip }, 'Rate limit exceeded');
      res.setHeader('Retry-After', String(ttl));
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  } catch (err) {
    logger.error({ err }, 'Rate limiter error, allowing request');
    next();
  }
}

// Health and root
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('Influenza Care API - Running on Cloud Run'));

// Admin routes
app.post('/admin/keys', adminAuthMiddleware, async (req, res) => {
  const quota = Number(req.body.quota) || DEFAULT_KEY_QUOTA;
  const keyObj = await createAppKey(quota);
  await incrMetric('admin_keys_created');
  logger.info({ keyId: keyObj.id }, 'Admin created key');
  res.json(keyObj);
});

app.get('/admin/keys', adminAuthMiddleware, async (req, res) => {
  const keys = await redis.keys('appkey:*');
  const list: any[] = [];
  for (const k of keys) {
    const data = await redis.hgetall(k);
    list.push({ id: data.id, active: data.active === '1', quota: Number(data.quota || DEFAULT_KEY_QUOTA), createdAt: Number(data.createdAt || 0) });
  }
  res.json(list);
});

app.post('/admin/keys/:id/revoke', adminAuthMiddleware, async (req, res) => {
  const id = req.params.id;
  const byId = await getAppKeyDataById(id);
  if (!byId) return res.status(404).json({ error: 'Not found' });
  await revokeAppKeyByKey(byId.key);
  logger.info({ keyId: id }, 'Admin revoked key');
  res.json({ ok: true });
});

app.post('/admin/keys/:id/token', adminAuthMiddleware, async (req, res) => {
  const id = req.params.id;
  const byId = await getAppKeyDataById(id);
  if (!byId) return res.status(404).json({ error: 'Not found' });
  if (!APP_JWT_SECRET) return res.status(500).json({ error: 'APP_JWT_SECRET not configured' });
  const token = jwt.sign({ sub: id }, APP_JWT_SECRET, { expiresIn: APP_JWT_EXP });
  res.json({ token, expiresIn: APP_JWT_EXP });
});

// Metrics
app.get('/metrics', async (req, res) => {
  try {
    const authFailures = await redis.get('metrics:auth_failures') || '0';
    const throttles = await redis.get('metrics:throttle_events') || '0';
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(`# HELP app_auth_failures Total authentication failures\n# TYPE app_auth_failures counter\napp_auth_failures ${authFailures}\n# HELP app_throttle_events Total throttle events\n# TYPE app_throttle_events counter\napp_throttle_events ${throttles}\n`);
  } catch (err) {
    res.status(500).send('metrics error');
  }
});

// Chat endpoint protected by auth + rate limiter
app.post('/api/chat', authMiddleware, keyRateLimiter, async (req, res) => {
  const { message, history } = req.body as { message: string; history?: { role: string; content: string }[] };
  if (!message) return res.status(400).json({ error: 'Missing message' });

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY not set on server');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const ai = new GoogleGenAI({ apiKey });

    let prompt = '';
    if (Array.isArray(history)) {
      for (const h of history) prompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n`;
    }
    prompt += `User: ${message}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ text: prompt }],
      config: { maxOutputTokens: 512 }
    });

    res.json({ reply: response.text ?? '' });
  } catch (err) {
    logger.error({ err }, 'Chat proxy error');
    res.status(500).json({ error: 'AI service error' });
  }
});

const server: Server = app.listen(PORT, HOST, () => {
  logger.info(`Server listening on http://${HOST}:${PORT}`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received: closing HTTP server...`);
  server.close(async () => {
    try { await redis.quit(); } catch (e) { /* ignore */ }
    logger.info('HTTP server closed. Exiting process.');
    (process as any).exit(0);
  });
};

(process as any).on('SIGTERM', () => gracefulShutdown('SIGTERM'));
(process as any).on('SIGINT', () => gracefulShutdown('SIGINT'));
