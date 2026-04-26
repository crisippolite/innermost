# Innermost

Innermost is a research app framed around Leopold Aschenbrenner's "Situational Awareness" thesis and the innermost-loop framework for AI investing.

It ships as a small monorepo:

- `backend/` - Node/Express API that fetches live 13F filings from SEC EDGAR, classifies holdings by loop ring, aggregates cross-fund conviction, and proxies Advisor chat to Anthropic.
- `frontend/` - React/Vite app with four tabs: Loop, Smart Money, Picks, and Advisor.

## Local Setup

Use Node 20+.

```bash
npm run install:all
```

Create backend environment variables from `backend/.env.example`:

```bash
export SEC_USER_AGENT="Your Name your@email.com"
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-sonnet-4-6"
export ALLOWED_ORIGINS="http://localhost:5173"
```

Create `frontend/.env.local`:

```bash
VITE_BACKEND_URL=http://localhost:3000
```

Run both processes:

```bash
npm run dev:backend
npm run dev:frontend
```

Open `http://localhost:5173`.

## API

- `GET /` - backend health response.
- `GET /api/funds` - curated fund registry.
- `GET /api/fund/:cik/filings` - latest 13F filing metadata for one fund.
- `GET /api/fund/:cik/latest` - latest holdings, ring classification, and summary for one fund.
- `GET /api/picks` - cross-fund conviction ranking grouped by loop ring.
- `GET /api/refresh` - clears the 6-hour in-memory cache.
- `POST /api/chat` - Advisor chat proxy. Requires `ANTHROPIC_API_KEY`.

## Deployment Notes

Deploy `backend/` as a Node service on Railway, Render, Fly.io, or similar. Set:

- `SEC_USER_AGENT`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ALLOWED_ORIGINS`

Deploy `frontend/` as a Vite static site. Set `VITE_BACKEND_URL` to the backend service URL at build time.

## Caveats

13Fs are delayed, long-only US equity disclosures. They do not show shorts, most non-US holdings, or complete derivatives context. The app is a research signal, not investment advice. Verify data on SEC EDGAR before acting on any position.
