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

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('Influenza Care API - Running on Cloud Run');
});

// Server-side chat proxy: receives message + history from the frontend and calls the GenAI SDK using a server-side API key.
app.post('/api/chat', async (req, res) => {
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
