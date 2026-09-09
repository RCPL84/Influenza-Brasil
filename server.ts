import express from 'express';
import { Server } from 'http';
import { GoogleGenAI } from '@google/genai';

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

/**
 * Simple in-memory rate limiter middleware per IP.
 * - maxRequests: number of allowed requests per windowMs
 * - windowMs: time window in milliseconds
 *
 * NOTE: This is an in-memory limiter suitable for single-instance deployments or low-traffic dev use.
 * For production / multi-instance, use a distributed store (Redis) or a managed provider.
 */
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60; // default: 60 requests
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // default: 1 minute

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.expiresAt <= now) {
    // start a new window
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
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
  rateLimitMap.set(ip, entry);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - entry.count)));
  return next();
}

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('Influenza Care API - Running on Cloud Run');
});

// Apply rate limiter only to the chat endpoint to protect the GenAI quota.
app.post('/api/chat', rateLimitMiddleware, async (req, res) => {
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
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    // Fix: cast to any to access Node.js process.exit
    (process as any).exit(0);
  });
};

// Fix: cast to any to access Node.js process.on for signal handling
(process as any).on('SIGTERM', () => gracefulShutdown('SIGTERM'));
(process as any).on('SIGINT', () => gracefulShutdown('SIGINT'));
