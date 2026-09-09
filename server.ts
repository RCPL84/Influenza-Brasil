import express from 'express';
import { Server } from 'http';
import { GoogleGenAI } from '@google/genai';
import Redis from 'ioredis';

const app = express();

/**
 * 0.0.0.0: Essencial para que o Load Balancer do Cloud Run acesse o container.
 * PORT: Deve ser lida da variável de ambiente injetada pelo runtime.
 */
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

app.use(express.json());

// Basic CORS: allow a specific origin via env or fallback to allow all in dev.
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rate limit configuration
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60; // default: 60 requests
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // default: 1 minute
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://127.0.0.1:6379';

// In-memory fallback if Redis isn't available (keeps behaviour for single-instance/dev)
const inMemoryMap = new Map<string, { count: number; expiresAt: number }>();

let redisClient: Redis | null = null;
let redisAvailable = false;

try {
  redisClient = new Redis(REDIS_URL);
  redisClient.on('connect', () => {
    console.log('Redis: connected');
    redisAvailable = true;
  });
  redisClient.on('error', (err) => {
    console.error('Redis error:', err.message || err);
    redisAvailable = false;
  });
} catch (err) {
  console.error('Failed to initialize Redis client', err);
  redisAvailable = false;
}

async function redisRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || (req.connection && (req.connection as any).remoteAddress) || 'unknown';
  const key = `rl:${ip}`;
  const windowSec = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

  if (!redisClient || !redisAvailable) {
    // Fallback to in-memory limiter
    const now = Date.now();
    const entry = inMemoryMap.get(ip);

    if (!entry || entry.expiresAt <= now) {
      inMemoryMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
      res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX - 1));
      return next();
    }

    if (entry.count >= RATE_LIMIT_MAX) {
      const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    entry.count += 1;
    inMemoryMap.set(ip, entry);
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - entry.count)));
    return next();
  }

  try {
    // Use Redis INCR and EXPIRE atomically across instances
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, windowSec);
    }

    const remaining = Math.max(0, RATE_LIMIT_MAX - Number(current));
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (Number(current) > RATE_LIMIT_MAX) {
      const ttl = await redisClient.ttl(key);
      res.setHeader('Retry-After', String(ttl));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return next();
  } catch (err) {
    console.error('Redis rate limiter error, falling back to in-memory', err);
    redisAvailable = false;
    return redisRateLimit(req, res, next); // retry using fallback
  }
}

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('Influenza Care API - Running on Cloud Run');
});

// Apply Redis-backed rate limiter (with in-memory fallback) to the chat endpoint to protect the GenAI quota.
app.post('/api/chat', redisRateLimit, async (req, res) => {
  const { message, history } = req.body as { message: string; history?: { role: string; content: string }[] };

  if (!message) return res.status(400).json({ error: 'Missing message' });

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set on server');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build a simple prompt by stitching history and the new user message.
    let prompt = '';
    if (Array.isArray(history)) {
      for (const h of history) {
        const roleLabel = h.role === 'user' ? 'User' : 'Assistant';
        prompt += `${roleLabel}: ${h.content}\n`;
      }
    }
    prompt += `User: ${message}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ text: prompt }],
      config: { maxOutputTokens: 512 }
    });

    // response.text is expected to contain the generated text
    return res.json({ reply: response.text ?? '' });
  } catch (error) {
    console.error('Chat proxy error:', error);
    return res.status(500).json({ error: 'AI service error' });
  }
});

const server: Server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
});

/**
 * Graceful Shutdown: Garante que o SIGTERM do Cloud Run seja tratado,
 * permitindo que conexões ativas terminem antes do encerramento.
 */
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received: closing HTTP server...`);
  server.close(async () => {
    try {
      if (redisClient) await redisClient.quit();
    } catch (e) {
      // ignore
    }
    console.log('HTTP server closed. Exiting process.');
    (process as any).exit(0);
  });
};

// Fix: cast to any to access Node.js process.on for signal handling
(process as any).on('SIGTERM', () => gracefulShutdown('SIGTERM'));
(process as any).on('SIGINT', () => gracefulShutdown('SIGINT'));