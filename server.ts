
import express from 'express';
import { Server } from 'http';

const app = express();

/**
 * 0.0.0.0: Essencial para que o Load Balancer do Cloud Run acesse o container.
 * PORT: Deve ser lida da variável de ambiente injetada pelo runtime.
 */
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0'; 

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('Influenza Care API - Running on Cloud Run');
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
