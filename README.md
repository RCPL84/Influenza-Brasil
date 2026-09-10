<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/141LhXDgymRQ3z95aA1jLQvtUSdRl4utc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in your environment to your Gemini API key (server-side only). Do NOT place this secret in client-side files or in `.env` values that will be injected into the browser bundle.

   - macOS / Linux:
     ```bash
     export GEMINI_API_KEY="sk_your_key_here"
     ```
   - Windows PowerShell:
     ```powershell
     $env:GEMINI_API_KEY = "sk_your_key_here"
     ```

3. Run the frontend dev server:
   `npm run dev`

4. Run the server proxy (dev):
   `npm run dev:server`

The app's frontend talks to a server-side proxy at `/api/chat` which holds the GEMINI_API_KEY and calls the GenAI SDK. This ensures your API key is never bundled into browser code.

> Tip: Copy `.env.local.example` to `.env.local` and fill in your local values. Keep `.env.local` out of version control — this repo includes `.env.local.example` as a template.

### Production-style run

1. Build the frontend:
   `npm run build`
2. Compile the TypeScript server (if your workflow outputs to `dist/`):
   `npx tsc`
3. Start the server (expects compiled JS at `dist/server.js`):
   `npm run start:server`

### Security note (essential)

- The GEMINI_API_KEY must remain on the server. Do not inject it into the client bundle via Vite `define` or similar. This repository was updated to move GenAI calls to a server-side `/api/chat` endpoint — keep that pattern.
- If you believe the key was ever committed, pushed, or exposed, rotate it immediately in the provider console.

### Useful tips

- For fast server development with automatic restarts, install `ts-node-dev` as a dev dependency and use it in `dev:server`.
- If serving frontend and backend from different origins, configure CORS on the server.


Redis (rate-limiter) — local dev
- This project supports a Redis-backed rate limiter for /api/chat. To run Redis locally:
  `docker compose up -d`
- Set REDIS_URL if needed:
  `export REDIS_URL=redis://127.0.0.1:6379`
- Recommended production note: use a managed/secured Redis instance; do not expose Redis publicly.

