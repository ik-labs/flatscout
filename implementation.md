# FlatScout — Implementation Tracker

> Reference: [mvp.md](./mvp.md) for full technical spec, tool schemas, system prompt, and architecture.

**Stack:** Vite + React 19 (SPA) · Hono (Node backend) · ElevenLabs UI + shadcn/ui · Firecrawl JS SDK · PostgreSQL (Docker) · Drizzle ORM · DigitalOcean Droplet · TypeScript

---

## Phase 0: Project Setup

**Goal:** Scaffold project, configure env vars, verify all API keys work.

- [x] Create monorepo structure with `client/` and `server/` directories
- [x] Initialize Vite React app in `client/`
  ```bash
  pnpm create vite client --template react-ts
  ```
- [x] Initialize Hono backend in `server/`
  ```bash
  mkdir server && cd server && pnpm init
  pnpm add hono @hono/node-server @mendable/firecrawl-js postgres drizzle-orm dotenv
  pnpm add -D tsx typescript @types/node drizzle-kit
  ```
- [x] Install frontend dependencies (note: using `@elevenlabs/react` instead of deprecated `@11labs/react`)
  ```bash
  cd client
  pnpm add @11labs/react react-router-dom
  pnpm add -D tailwindcss @tailwindcss/vite
  ```
- [ ] Initialize shadcn/ui in `client/` *(interactive CLI — run manually)*
  ```bash
  pnpm dlx shadcn@latest init
  ```
- [ ] Install ElevenLabs UI components in `client/` *(interactive CLI — run manually)*
  ```bash
  pnpm dlx @elevenlabs/cli@latest components add conversation orb waveform transcript-viewer voice-button
  ```
- [x] Create `.env` in `server/` with all required keys:
  ```env
  FIRECRAWL_API_KEY=
  ELEVENLABS_AGENT_ID=
  ELEVENLABS_API_KEY=
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flatscout
  PORT=3000
  ```
- [x] Create `.env` in `client/` for Vite:
  ```env
  VITE_API_URL=http://localhost:3000
  ```
- [x] Create `docker-compose.yml` for local Postgres
  ```yaml
  services:
    db:
      image: postgres:16-alpine
      ports: ["5432:5432"]
      environment:
        POSTGRES_DB: flatscout
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
      volumes: [pgdata:/var/lib/postgresql/data]
  volumes:
    pgdata:
  ```
- [ ] Start Postgres, verify connection *(run `docker compose up -d` when ready)*
- [x] Create project directory structure (see below)
- [ ] Verify Firecrawl API key works *(needs API key in `.env`)*

### Directory Structure
```
flatscout/
├── client/                        # Vite + React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── flatscout-agent.tsx     # Main agent component with client tools
│   │   │   ├── voice-panel.tsx         # Left panel: Orb, Waveform, Transcript
│   │   │   ├── research-dashboard.tsx  # Right panel: cards, table, warnings
│   │   │   ├── listing-card.tsx
│   │   │   ├── comparison-table.tsx
│   │   │   ├── warning-banner.tsx
│   │   │   └── search-status.tsx
│   │   ├── lib/
│   │   │   └── types.ts               # Shared frontend types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/                        # Hono backend
│   ├── index.ts                   # Hono app entry + static file serving
│   ├── routes/
│   │   ├── search-listings.ts
│   │   ├── scrape-listing.ts
│   │   ├── deep-dive.ts
│   │   ├── verify-neighborhood.ts
│   │   ├── interact-page.ts
│   │   └── get-signed-url.ts      # ElevenLabs signed URL endpoint
│   ├── lib/
│   │   ├── firecrawl.ts           # Firecrawl SDK wrapper + safeFirecrawlSearch
│   │   ├── session.ts             # In-memory session store
│   │   ├── types.ts               # Shared backend types
│   │   ├── schemas.ts             # JSON schemas (LISTING_SCHEMA etc.)
│   │   ├── utils.ts               # extractDomain, filterRelevantPages, deduplicateAndScore
│   │   └── verification.ts        # synthesizeVerification helper
│   └── db/                        # Extended goal
│       ├── schema.ts              # Drizzle schema
│       └── index.ts               # DB connection
├── docker-compose.yml
└── Caddyfile                      # Production reverse proxy config
```

**✅ Phase 0 Done when:** `pnpm dev` runs both Vite (client) and Hono (server), Postgres is up, Firecrawl test call returns results.

---

## Phase 1: Backend Core (API Routes + Lib Helpers)

**Goal:** All 5 API routes working and testable via curl/Postman. No frontend needed yet.

**Ref:** mvp.md §4 for full endpoint code.

### 1.1 Hono Server Entry Point
- [ ] **`server/index.ts`** — Create Hono app, mount routes, CORS middleware, logger
  - In production: serve `client/dist/` as static files with SPA fallback
  - In dev: just API routes (Vite dev server handles frontend)

### 1.2 Lib Helpers
- [ ] **`server/lib/types.ts`** — Define `Listing`, `Warning`, `SearchStatus`, `Session`, `VerificationReport` types
- [ ] **`server/lib/firecrawl.ts`** — Firecrawl client init + `safeFirecrawlSearch()` wrapper that catches errors and returns `null` instead of throwing
- [ ] **`server/lib/session.ts`** — `getOrCreateSession(sessionId)` using in-memory `Map<string, Session>`
- [ ] **`server/lib/schemas.ts`** — `LISTING_SCHEMA` and other JSON extraction schemas
- [ ] **`server/lib/utils.ts`** — `extractDomain()`, `filterRelevantPages()`, `deduplicateAndScore()`
- [ ] **`server/lib/verification.ts`** — `synthesizeVerification()` that structures raw search results into a report

### 1.3 API Routes (Hono handlers)
- [ ] **`/api/get-signed-url`** — Returns ElevenLabs signed conversation URL (keeps API key server-side)
  - Test: `curl localhost:3000/api/get-signed-url`
  - ✅ Returns `{ signedUrl: "wss://..." }`
- [ ] **`/api/search-listings`** — Parallel Firecrawl searches across 4 sites, deduplicate, score
  - Test: `curl -X POST localhost:3000/api/search-listings -H "Content-Type: application/json" -d '{"session_id":"test","city":"Austin, TX","max_rent":1800,"bedrooms":1}'`
  - ✅ Returns `{ listings: [...] }` with 10+ results
- [ ] **`/api/scrape-listing`** — Scrape single URL with JSON schema extraction
  - Test with a real Zillow/Apartments.com listing URL
  - ✅ Returns structured data (rent, sqft, pet_policy, etc.)
- [ ] **`/api/deep-dive`** — Map building website + scrape relevant pages
  - Test with an apartment complex website
  - ✅ Returns `{ enriched_data: [...] }` with floor plan / pricing info
- [ ] **`/api/verify-neighborhood`** — Parallel searches for reviews, safety, noise
  - Test with a real Austin address
  - ✅ Returns verification report with reviews and safety data
- [ ] **`/api/interact-page`** — Firecrawl scrape + interact
  - Test with a listing page that has a "Check Availability" button
  - ✅ Returns interaction result or graceful error

### 1.4 Error Handling Verification
- [ ] Test each route with invalid input → returns `{ error: "..." }` not 500
- [ ] Test with unreachable URL → graceful error message
- [ ] Verify session caching: call `/api/scrape-listing` twice with same URL → second call is instant (cache hit)

**✅ Phase 1 Done when:** All 6 routes return valid JSON. Signed URL works. Errors are handled gracefully.

---

## Phase 2: ElevenLabs Agent Configuration

**Goal:** Voice agent works end-to-end: speak → agent calls your API routes → agent narrates results.

**Ref:** mvp.md §3 for system prompt, tool schemas, and config.

### 2.1 Agent Setup (ElevenLabs Dashboard)
- [ ] Create new Conversational AI agent
- [ ] Set LLM to Claude Sonnet 4
- [ ] Paste system prompt from mvp.md §3.1
- [ ] Select voice (warm, professional — e.g., "Rachel" or "Drew")
- [ ] Enable expressive mode
- [ ] Enable turn-taking / user interrupts

### 2.2 Server Tools (5 tools)
- [ ] Add `search_listings` — method POST, URL pointing to your deployed/tunneled backend
- [ ] Add `scrape_listing`
- [ ] Add `deep_dive_listing`
- [ ] Add `verify_neighborhood`
- [ ] Add `interact_with_page`
- [ ] Configure on all 5 tools:
  - `tool_error_handling_mode: "summarized"`
  - `response_timeout_secs: 60` (search, deep-dive) / `30` (scrape, verify, interact)
  - `force_pre_tool_speech: true` (search, verify)
- [ ] Add `session_id` parameter mapped from `system__conversation_id` on all tools

### 2.3 Client Tools (4 tools)
- [ ] Add `add_listing_card` (wait_for_response: false)
- [ ] Add `update_comparison_table` (wait_for_response: false)
- [ ] Add `show_warning` (wait_for_response: false)
- [ ] Add `set_search_status` (wait_for_response: false)

### 2.4 Dynamic Variables
- [ ] Configure: `user_city`, `user_budget`, `user_bedrooms`, `user_dealbreakers`, `listings_found_count`

### 2.5 Tool Call Sounds
- [ ] Add ambient "searching" sound for `search_listings`, `scrape_listing`
- [ ] Add typing/processing sound for `verify_neighborhood`

### 2.6 Testing (use ngrok/cloudflared to tunnel localhost)
- [ ] Use ElevenLabs playground to test voice → search flow
- [ ] Verify agent narrates progress ("Found X listings...")
- [ ] Verify agent calls scrape after search (tool chaining)
- [ ] Verify agent calls verify_neighborhood for top picks
- [ ] Test with bad input → agent handles gracefully via summarized error mode

**✅ Phase 2 Done when:** You can talk to the agent, it searches, scrapes, and narrates findings via voice. Tool calls show up in ElevenLabs dashboard logs.

---

## Phase 3: Frontend

**Goal:** Two-panel UI with voice panel (left) + research dashboard (right). Client tools push data to UI in real-time.

**Ref:** mvp.md §5 for layout, component list, and client tool registration code.

### 3.1 Voice Panel (Left — 40%)
- [ ] **`voice-panel.tsx`** — Layout with:
  - `<Orb />` — agent state visualization
  - `<Waveform />` or `<LiveWaveform />` — audio visualization
  - `<TranscriptViewer />` — live transcript
  - `<VoiceButton />` — mic toggle
- [ ] Style with TailwindCSS — dark theme recommended for visual impact

### 3.2 Research Dashboard (Right — 60%)
- [ ] **`search-status.tsx`** — Status bar: "Searching...", "Verifying...", "Complete"
- [ ] **`listing-card.tsx`** — Card: image, rent, sqft, bedrooms, source, score, highlights
  - Use shadcn/ui `Card` as base
- [ ] **`comparison-table.tsx`** — Ranked table of final listings
  - Use shadcn/ui `Table`
  - Columns: Rank, Name, Rent, Sqft, Score, Commute (if §9.1 done), Warnings
- [ ] **`warning-banner.tsx`** — Alert banner for red flags
  - Use shadcn/ui `Alert` with destructive variant
  - Types: price_mismatch, bad_reviews, noise, hidden_fees, availability, scam_risk

### 3.3 Main Agent Component
- [ ] **`flatscout-agent.tsx`** — Wire `useConversation` hook with:
  - Fetch signed URL from `/api/get-signed-url` before starting session
  - 4 client tools registered (see mvp.md §5.3)
  - `dynamicVariables` passed at session start
  - State management for listings, warnings, search status
- [ ] **`App.tsx`** — Two-panel layout combining voice panel + dashboard

### 3.4 Polish
- [ ] Smooth transitions when new listing cards appear (animate in)
- [ ] Warning banners attach to relevant listing cards
- [ ] Score badge: green ≥ 80, yellow ≥ 60, red < 60
- [ ] Mobile fallback: stacked layout (voice on top, dashboard below)

**✅ Phase 3 Done when:** Talking to the agent causes listing cards and warnings to appear in real-time on the dashboard. Comparison table populates at the end.

---

## Phase 4: Integration Testing

**Goal:** Full end-to-end flow works reliably with real data.

- [ ] **Test 1: Austin, TX** — 1BR, $1800, pet-friendly (primary demo scenario)
  - Verify: 10+ listings found, 3+ scraped in detail, neighborhood verified, comparison table populated
- [ ] **Test 2: Denver, CO** — 2BR, $2200, parking required
  - Verify: different sites return results, dedup works across sources
- [ ] **Test 3: Raleigh, NC** — Studio, $1200, no pets
  - Verify: thin results handled gracefully ("I found fewer options, let me broaden...")
- [ ] **Error scenario:** Disconnect internet mid-search → agent narrates fallback
- [ ] **Interruption test:** Redirect agent mid-search ("Actually, make it 2 bedrooms")
- [ ] **Cache test:** Run same search twice → second is faster (session cache hit)
- [ ] **Credit tracking:** Monitor Firecrawl credit usage across test runs
- [ ] Pre-warm cache for demo scenario (Austin, 1BR, $1800)

**✅ Phase 4 Done when:** 3/3 city tests pass. Error handling works. Demo scenario completes in < 4 minutes.

---

## Phase 5: Deploy

**Goal:** App is live on DigitalOcean Droplet with Postgres, accessible via public URL.

### 5.1 Droplet Setup
- [ ] Provision DigitalOcean Droplet (Ubuntu 22.04, 2GB+ RAM)
- [ ] Install Docker + Docker Compose
- [ ] Clone repo to Droplet

### 5.2 Docker Compose (Production)
- [ ] Create `docker-compose.prod.yml`:
  - **postgres** — Postgres 16 with persistent volume
  - **app** — Build Vite (`cd client && pnpm build`), then run Hono (`node server/dist/index.js`) serving static files + API on port 3000
- [ ] Configure env vars on Droplet (`.env.production`)
- [ ] Create `Caddyfile` for automatic HTTPS:
  ```
  flatscout.yourdomain.com {
    reverse_proxy localhost:3000
  }
  ```

### 5.3 Domain + DNS
- [ ] Point domain/subdomain to Droplet IP (e.g., `flatscout.yourdomain.com`)
- [ ] Verify HTTPS works

### 5.4 Update ElevenLabs Agent
- [ ] Update all 5 server tool webhook URLs from ngrok to production URL
- [ ] Test full flow against production deployment

### 5.5 Pre-Demo Checklist
- [ ] Run demo scenario on production → verify it works
- [ ] Pre-warm cache for Austin demo
- [ ] Check Firecrawl credit balance — enough for demo + 2 dry runs
- [ ] Verify agent voice and expressive mode on production

**✅ Phase 5 Done when:** Full flow works on `https://flatscout.yourdomain.com`.

---

## Phase 6: Demo Video + Submission

**Goal:** Record compelling 60-90s demo video. Submit to ElevenHacks.

**Ref:** mvp.md §8 for full demo script.

### 6.1 Prep
- [ ] Finalize demo script (adjust if commute §9.1 was/wasn't implemented)
- [ ] Practice 2-3 dry runs, time each one
- [ ] Set up recording environment (clean desk, good mic, screen recording)

### 6.2 Record
- [ ] Record screen + agent audio
- [ ] Include one 15-20s uncut segment (cards appearing + warning popping up live)
- [ ] Record the "one more thing" interact moment if `/interact` is reliable

### 6.3 Edit
- [ ] CapCut: tight cuts, captions, transitions
- [ ] Background music (ElevenLabs Music: "upbeat confident tech demo 100bpm")
- [ ] Hook text overlay at start
- [ ] Re-export in 9:16 vertical for Reels/TikTok

### 6.4 Post + Submit
- [ ] Write platform-specific posts (X, LinkedIn, Instagram, TikTok)
- [ ] Post on all 4 platforms — tags: @firecrawl @elevenlabs #ElevenHacks
- [ ] Upload submission on ElevenHacks portal:
  - Public GitHub repo link
  - Live demo URL
  - Demo video link

**✅ Phase 6 Done when:** Video posted on all platforms. Submission uploaded on ElevenHacks.

---

## Extended Goals Tracker

Only tackle if core phases are done early. See mvp.md §9 for full specs.

- [ ] **§9.1 Commute Time** — `calculate_commute` tool + Google Maps Distance Matrix API
- [ ] **§9.2 Map View** — Mapbox GL JS / Leaflet + `add_map_pin` client tool
- [ ] **§9.3 Session Persistence** — Drizzle + Postgres (tables: sessions, listings_cache, search_history)
- [ ] **§9.4 Save & Share** — Shareable shortlist URL

---

## Env Vars Reference

| Variable | Where | Notes |
|---|---|---|
| `FIRECRAWL_API_KEY` | `server/.env` | From [firecrawl.dev](https://firecrawl.dev) |
| `ELEVENLABS_AGENT_ID` | `server/.env` | From ElevenLabs dashboard after creating agent |
| `ELEVENLABS_API_KEY` | `server/.env` | From ElevenLabs dashboard → API Keys (server-side only!) |
| `DATABASE_URL` | `server/.env` | `postgresql://postgres:postgres@localhost:5432/flatscout` |
| `PORT` | `server/.env` | `3000` |
| `VITE_API_URL` | `client/.env` | `http://localhost:3000` (dev) or empty string (prod, same origin) |
| `GOOGLE_MAPS_API_KEY` | `server/.env` | Only if implementing §9.1 (commute) |

---

## Progress Log

| Date | Phase | What was done | Blockers |
|---|---|---|---|
| | | | |
