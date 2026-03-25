# FlatScout

FlatScout is a voice-first apartment research app. You describe your preferences, the agent searches listings, scrapes details, verifies neighborhood signals, and returns a ranked shortlist in a live dashboard.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind
- Backend: Hono (Node + TypeScript)
- Voice agent: ElevenLabs Conversational AI
- Web research: Firecrawl
- Data: PostgreSQL (Docker)
- Deployment: Docker Compose + Caddy (HTTPS)

## Repository Structure

- `client/` - Vite + React application
- `server/` - Hono API server and route handlers
- `docker-compose.prod.yml` - Production stack (app + db + caddy)
- `Caddyfile` - Domain reverse proxy config
- `mvp.md` - Detailed product and architecture spec
- `implementation.md` - Build tracker

## Environment Variables

Do not commit secrets. Keep real credentials in local env files only.

### Production

Copy:

```bash
cp .env.production.example .env.production
```

Fill:

- `FIRECRAWL_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_API_KEY`
- `DATABASE_URL`
- `PORT`
- `NODE_ENV`

### Local development

- `server/.env` (based on `server/.env.example`)
- `client/.env` (based on `client/.env.example`)

## Run Locally

From repo root:

```bash
pnpm install
pnpm dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Hono backend on `http://localhost:3000`

Health check:

```bash
curl http://localhost:3000/api/health
```

## Deploy (DigitalOcean Droplet)

1. Point your domain to the droplet IP.
2. Update `Caddyfile` domain if needed.
3. Create `.env.production`.
4. Deploy:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## ElevenLabs Agent Setup (High Level)

Create an ElevenLabs agent and configure:

- System prompt from `mvp.md` (FlatScout sections)
- LLM: Claude Sonnet 4/4.5
- 5 server tools pointing to your backend:
  - `/api/search-listings`
  - `/api/scrape-listing`
  - `/api/deep-dive`
  - `/api/verify-neighborhood`
  - `/api/interact-page`

Then set:

- `ELEVENLABS_API_KEY` (secret key)
- `ELEVENLABS_AGENT_ID` (agent identifier)

## Notes

- Keep `.env.production.example` as placeholders only.
- Real keys belong in `.env` / `.env.production`, which are gitignored.
