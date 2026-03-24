# FlatScout — MVP Technical Spec

**One-liner:** Tell an AI what apartment you want. It searches, scrapes, verifies, and hands you a ranked shortlist — all through voice.

**Scope:** US rental market (Zillow, Apartments.com, Craigslist, Redfin, etc.)

**Reference:**

https://elevenlabs.io/docs/conversational-ai/docs/introduction
https://docs.firecrawl.dev/features/search
https://hacks.elevenlabs.io/hackathons/0

---

## 1. How It Works (User Journey)

### Step 1: Voice Intake (ElevenAgents — 60-90 seconds)
User opens web app, clicks mic, and talks naturally:

> "I need a 1-bedroom in Austin under $1,800/month. I work at the Domain so I want a short commute. Pet-friendly — I have a dog. Move-in by May 1st. No basement units."

The ElevenAgent asks 1-2 follow-ups:
> "Got it — Austin, 1BR, under $1,800, pet-friendly, near the Domain. Anything else? Laundry in-unit? Parking?"

User confirms. Agent locks in preferences as dynamic variables.

### Step 2: Autonomous Search (Firecrawl — 2-3 minutes)
The agent announces: "I'm searching across multiple listing sites now. I'll walk you through what I find."

Behind the scenes, the backend fires parallel Firecrawl operations:
- **Search** across Zillow, Apartments.com, Craigslist Austin with location + time filters
- **Scrape** each promising listing URL → extract structured data (rent, deposit, sqft, pet policy, amenities, photos, move-in date)
- **Map** building/complex websites to discover floor plans, pricing pages, and amenity lists that aren't on the listing page

The agent narrates progress via voice:
> "Found 18 listings so far. Filtering for pet-friendly... down to 11. Let me check commute times to the Domain... 7 are under 20 minutes."

Client tools push each qualified listing as a card to the live dashboard.

### Step 3: Verification & Deep Dive (Firecrawl Interact + Search — 1-2 minutes)
For top candidates, the agent goes deeper:
- **Interact** with the listing page to check availability ("Click on 'Check Availability' to see if units are actually open")
- **Search** for the building/complex name + "reviews" + "complaints" to find real tenant feedback
- **Search** for the address + "crime" / "noise" / "flood zone" for neighborhood intel
- Cross-references listing claims against scraped review data

Agent narrates contradictions:
> "This one says 'quiet neighborhood' but I found 3 recent noise complaints on the city's portal. Moving it down in the ranking."

### Step 4: Ranked Shortlist & Handoff (ElevenAgents — 60 seconds)
Agent presents the final 3-5 listings verbally:
> "Here's my top 3. Number one: The Alexan on Burnet Road. $1,650 for a 1BR/1BA, 740 sqft. 12-minute drive to the Domain. Pet deposit is $300 one-time. Move-in available April 15th. Tenants rate it 4.2 out of 5 — common praise for management responsiveness. I'll put the link in your dashboard."

User can ask follow-ups: "What about parking?" → agent either knows from scraped data or does a quick search.

Dashboard shows the full shortlist with all data, links, and the agent's notes.

---

## 2. Architecture

### 2.1 Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | Vite + React 19 (SPA) |
| **UI Components** | ElevenLabs UI + shadcn/ui + TailwindCSS + Lucide |
| **Voice/Agent** | ElevenLabs Conversational AI + React SDK (`@11labs/react`) |
| **LLM** | Claude Sonnet 4 (via ElevenLabs agent config) |
| **Backend** | Hono (TypeScript, runs on Node) |
| **Web Scraping** | Firecrawl JS SDK (`@mendable/firecrawl-js`) |
| **Database** | PostgreSQL (Docker on same DO Droplet) via Drizzle ORM + `postgres-js` |
| **Hosting** | DigitalOcean Droplet (Hono serves API + static React build + Postgres Docker) |
| **Language** | TypeScript everywhere |

### 2.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    DIGITALOCEAN DROPLET                        │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │               HONO SERVER (Node.js)                    │     │
│  │                                                        │     │
│  │  ┌─ STATIC FILES (Vite React build) ───────────────┐ │     │
│  │  │  Hono serves dist/ on GET /* (SPA fallback)      │ │     │
│  │  │                                                    │ │     │
│  │  │  ┌──────────────┐  ┌──────────────────────────┐  │ │     │
│  │  │  │  Voice Panel  │  │   Research Dashboard      │  │ │     │
│  │  │  │  (EL UI)      │  │   - Listing cards (live)  │  │ │     │
│  │  │  │  - Orb        │  │   - Comparison table      │  │ │     │
│  │  │  │  - Waveform   │  │   - Warning banners       │  │ │     │
│  │  │  │  - Transcript │  │   - Search status         │  │ │     │
│  │  │  │  - VoiceBtn   │  │   - Map view (extended)   │  │ │     │
│  │  │  └──────────────┘  └──────────────────────────┘  │ │     │
│  │  │                                                    │ │     │
│  │  │  Client Tools receive data from agent to update UI │ │     │
│  │  └────────────────────────────────────────────────────┘ │     │
│  │                                                          │     │
│  │  ┌─ API ROUTES (/api/*) ────────────────────────────┐   │     │
│  │  │                                                    │   │     │
│  │  │  POST /api/search-listings                         │   │     │
│  │  │    → Firecrawl /search (parallel across sites)     │   │     │
│  │  │    → Deduplicates, scores, normalizes              │   │     │
│  │  │                                                    │   │     │
│  │  │  POST /api/scrape-listing                          │   │     │
│  │  │    → Firecrawl /scrape with JSON schema extraction │   │     │
│  │  │                                                    │   │     │
│  │  │  POST /api/deep-dive                               │   │     │
│  │  │    → Firecrawl /map + /scrape on building sites    │   │     │
│  │  │                                                    │   │     │
│  │  │  POST /api/verify-neighborhood                     │   │     │
│  │  │    → Firecrawl /search for reviews, safety, noise  │   │     │
│  │  │                                                    │   │     │
│  │  │  POST /api/interact-page                           │   │     │
│  │  │    → Firecrawl /scrape + /interact                 │   │     │
│  │  │                                                    │   │     │
│  │  │  POST /api/get-signed-url                          │   │     │
│  │  │    → ElevenLabs API → signed conversation URL      │   │     │
│  │  │                                                    │   │     │
│  │  │  Session: in-memory Map + Drizzle/Postgres for     │   │     │
│  │  │  persistence (extended goal)                       │   │     │
│  │  └────────────────────────────────────────────────────┘   │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─────────────────────────────┐                                  │
│  │  POSTGRES (Docker)           │  ← same machine, zero latency   │
│  │  - sessions                  │                                  │
│  │  - listings_cache            │                                  │
│  │  - search_history            │                                  │
│  └─────────────────────────────┘                                  │
│                                                                    │
│  ┌─────────────────────────────┐                                  │
│  │  CADDY (reverse proxy)       │  ← automatic HTTPS               │
│  │  :443 → localhost:3000       │                                  │
│  └─────────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘
                   │
                   │ WebSocket / WebRTC (ElevenLabs React SDK)
                   │
┌──────────────────▼──────────────────────────────────┐
│              ELEVENLABS AGENT (hosted)                │
│                                                      │
│  System Prompt: FlatScout persona + research logic   │
│  LLM: Claude Sonnet 4 (recommended for tool use)    │
│  Voice: Professional, warm, concise                  │
│  Expressive mode: ON                                 │
│                                                      │
│  Server Tools (call Hono API routes):                │
│    - search_listings                                 │
│    - scrape_listing                                  │
│    - deep_dive_listing                               │
│    - verify_neighborhood                             │
│    - interact_with_page                              │
│                                                      │
│  Client Tools (update frontend):                     │
│    - add_listing_card                                │
│    - update_comparison_table                         │
│    - show_warning                                    │
│    - set_search_status                               │
└──────────────────────────────────────────────────────┘
```

---

## 3. ElevenAgents Configuration

### 3.1 System Prompt

```
You are FlatScout — an autonomous apartment-finding agent for renters in the United States.

## YOUR ROLE
You are a sharp, efficient rental scout. You don't just search — you investigate, verify, and recommend. You save renters hours of tedious searching by doing the legwork yourself.

## PERSONALITY
- Confident and direct. No filler. Every sentence has value.
- You sound like a knowledgeable friend who happens to be great at finding apartments.
- When you find red flags (hidden fees, bad reviews, misleading photos), call them out clearly.
- When you find a great deal, show genuine enthusiasm.
- Never speak for more than 15 seconds without either taking an action or asking the user something.

## CONVERSATION FLOW

### Phase 1: INTAKE (goal: lock in all preferences in under 90 seconds)
Ask what the user is looking for. Required info:
- City/area
- Budget (max rent per month)
- Bedrooms/bathrooms
- Move-in timeline
- Dealbreakers (pets, parking, laundry, etc.)

If the user gives most of this upfront, confirm and move on. Don't over-ask.
Store all preferences using dynamic variables.

### Phase 2: SEARCH (goal: find and filter listings)
1. Announce you're starting the search.
2. Call `search_listings` with the user's criteria.
3. Narrate the initial count: "Found X listings across [sites]. Filtering now..."
4. For each promising listing, call `scrape_listing` to get full details.
5. Use `add_listing_card` client tool to push each qualifying listing to the dashboard.
6. Narrate key findings as you go — don't silently process.
7. If initial results are thin, broaden the search (increase budget by 10%, expand area).

### Phase 3: VERIFY (goal: catch red flags, confirm claims)
For top 3-5 listings:
1. Call `verify_neighborhood` to check reviews, complaints, safety.
2. Call `deep_dive_listing` if the listing page is thin or claims seem too good.
3. Optionally call `interact_with_page` to check real-time availability.
4. Narrate any red flags or positive signals found.
5. Use `show_warning` client tool for contradictions or concerns.

### Phase 4: RECOMMEND (goal: deliver a clear ranked shortlist)
1. Rank remaining listings by fit score.
2. Present top 3 verbally with key stats: rent, size, commute, standout pros/cons.
3. Update comparison table via `update_comparison_table` client tool.
4. Ask if the user wants to explore any listing deeper or adjust criteria.

## TOOL USAGE RULES
- Always search before making claims about availability or pricing.
- Call `scrape_listing` for any listing you want to recommend — never recommend based on search snippet alone.
- Use `verify_neighborhood` for your top 3 — always. Renters deserve verified info.
- When you find contradictions (listing says "quiet" but reviews say "loud"), always flag it.
- Use `interact_with_page` sparingly — only when checking availability or prices that might be dynamic.

## GUARDRAILS
- Never invent listing data. If you don't know, say so and search.
- Always cite which site a listing came from.
- If all results are poor, say so honestly. Don't force recommendations.
- Remind the user to verify in person before signing anything.
```

### 3.2 Voice & Language Configuration
- **Voice:** Pick a warm, professional voice from ElevenLabs library (e.g., "Rachel" or "Drew")
- **Language:** English (US)
- **Expressive mode:** ON — lets the agent sound genuinely excited about good finds and concerned about red flags
- **Turn-taking:** Allow user interruptions — critical for redirecting research mid-flow

### 3.3 Server Tools (5 tools, each calls your FastAPI backend)

#### Tool 1: `search_listings`
```
Name: search_listings
Description: Search for apartment listings across multiple rental websites based on user criteria. Call this first when starting a search. Returns a list of listing summaries with URLs.
Method: POST
URL: https://your-backend.com/api/search-listings
Body Parameters:
  - session_id (string, required): Conversation session ID (mapped from system__conversation_id dynamic variable)
  - city (string, required): City and state, e.g. "Austin, TX"
  - max_rent (integer, required): Maximum monthly rent in dollars
  - bedrooms (integer, required): Number of bedrooms (0 for studio)
  - pet_friendly (boolean, optional): Whether pets are allowed
  - keywords (string, optional): Additional search terms like "laundry in-unit" or "garage parking"
```

#### Tool 2: `scrape_listing`
```
Name: scrape_listing
Description: Scrape a specific listing URL to extract full structured details including rent, deposit, square footage, amenities, pet policy, photos, and move-in date. Call this for any listing you want to recommend.
Method: POST
URL: https://your-backend.com/api/scrape-listing
Body Parameters:
  - session_id (string, required): Conversation session ID (mapped from system__conversation_id dynamic variable)
  - url (string, required): The full URL of the listing page
  - extract_fields (string, optional): Comma-separated list of specific fields to extract
```

#### Tool 3: `deep_dive_listing`
```
Name: deep_dive_listing
Description: Deep-dive a building or apartment complex by discovering all related pages (floor plans, pricing, amenities) and scraping them. Use when a listing seems thin or you need more details about the property.
Method: POST
URL: https://your-backend.com/api/deep-dive
Body Parameters:
  - session_id (string, required): Conversation session ID (mapped from system__conversation_id dynamic variable)
  - listing_url (string, required): The listing or building website URL
  - search_query (string, optional): Specific info to look for, e.g. "floor plans" or "move-in specials"
```

#### Tool 4: `verify_neighborhood`
```
Name: verify_neighborhood
Description: Verify a listing's neighborhood by searching for tenant reviews, noise complaints, safety data, and community feedback. Always call this for your top recommended listings.
Method: POST
URL: https://your-backend.com/api/verify-neighborhood
Body Parameters:
  - session_id (string, required): Conversation session ID (mapped from system__conversation_id dynamic variable)
  - address (string, required): Full address or building name + city
  - building_name (string, optional): Name of the apartment complex
  - check_types (string, optional): Comma-separated list of "reviews,safety,noise,flooding"
```

#### Tool 5: `interact_with_page`
```
Name: interact_with_page
Description: Interact with a listing page to perform actions like checking availability, viewing pricing for specific units, or filling inquiry forms. Use sparingly for dynamic content that can't be scraped statically.
Method: POST
URL: https://your-backend.com/api/interact-page
Body Parameters:
  - session_id (string, required): Conversation session ID (mapped from system__conversation_id dynamic variable)
  - url (string, required): The page URL to interact with
  - action (string, required): What to do, e.g. "Check availability for 1BR units" or "Click on floor plans tab"
```

### 3.4 Client Tools (4 tools, executed on frontend)

#### Client Tool 1: `add_listing_card`
```
Name: add_listing_card
Description: Add a new listing card to the user's research dashboard. Call this whenever you find a qualified listing.
Parameters:
  - listing_id (string): Unique ID for this listing
  - title (string): Listing title/address
  - rent (integer): Monthly rent
  - bedrooms (integer): Number of bedrooms
  - sqft (integer): Square footage
  - image_url (string): Primary photo URL
  - source_url (string): Link to original listing
  - source_site (string): Name of listing site (Zillow, etc.)
  - highlights (string): Comma-separated key features
  - warnings (string): Comma-separated concerns (optional)
  - score (integer): Fit score 1-100
Wait for response: false
```

#### Client Tool 2: `update_comparison_table`
```
Name: update_comparison_table
Description: Update the comparison table with final ranked listings. Call this during the recommendation phase.
Parameters:
  - listings_json (string): JSON array of ranked listings with all fields
Wait for response: false
```

#### Client Tool 3: `show_warning`
```
Name: show_warning
Description: Display a warning or red flag about a specific listing on the dashboard.
Parameters:
  - listing_id (string): Which listing this warning applies to
  - warning_type (string): One of "price_mismatch", "bad_reviews", "noise", "hidden_fees", "availability", "scam_risk"
  - message (string): The specific warning text
Wait for response: false
```

#### Client Tool 4: `set_search_status`
```
Name: set_search_status
Description: Update the search status indicator on the dashboard.
Parameters:
  - status (string): One of "searching", "filtering", "verifying", "complete"
  - message (string): Status message like "Searching Zillow..." or "Verifying top 3 listings"
Wait for response: false
```

### 3.5 Server Tool Error Handling & Timeouts
- **`tool_error_handling_mode: "summarized"`** on all 5 server tools — the agent will narrate graceful fallbacks (e.g., "I couldn't access that listing, moving on") instead of crashing
- **`response_timeout_secs: 60`** for `search_listings` and `deep_dive_listing` (parallel Firecrawl calls take longer)
- **`response_timeout_secs: 30`** for `scrape_listing`, `verify_neighborhood`, and `interact_with_page`
- **`force_pre_tool_speech: true`** on `search_listings` and `verify_neighborhood` — agent always narrates before these long-running tools
- **`execution_mode: "immediate"`** on all tools (default)

### 3.6 Tool Call Sounds
- Configure ambient "searching" sound during `search_listings` and `scrape_listing` calls
- Subtle typing/processing sound during `verify_neighborhood`
- Brief positive chime when `add_listing_card` fires (optional)

### 3.7 Personalization / Dynamic Variables
- `system__conversation_id` — auto-provided by ElevenLabs, passed as `session_id` to all server tools for backend session tracking
- `user_city` — set after intake
- `user_budget` — set after intake
- `user_bedrooms` — set after intake
- `user_dealbreakers` — set after intake
- `listings_found_count` — updated by backend via dynamic variable assignments
- `search_session_id` — set on conversation start (fallback; prefer `system__conversation_id`)

---

## 4. Backend Endpoints (Hono API Routes)

### 4.1 POST `/api/search-listings`

```typescript
// server/routes/search-listings.ts
import { Hono } from "hono";
import { safeFirecrawlSearch } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { deduplicateAndScore } from "../lib/utils";

const app = new Hono();

app.post("/api/search-listings", async (c) => {
  const { session_id, city, max_rent, bedrooms, pet_friendly, keywords } =
    await c.req.json();

  const session = getOrCreateSession(session_id);

  const queries = [
    `${bedrooms}BR apartment ${city} under $${max_rent} ${keywords} site:zillow.com`,
    `${bedrooms} bedroom apartment ${city} under $${max_rent} ${keywords} site:apartments.com`,
    `${bedrooms}BR ${city} $${max_rent} ${keywords} site:craigslist.org`,
    `${bedrooms} bedroom ${city} rent under $${max_rent} ${keywords} site:redfin.com`,
  ];

  // Fire all searches in parallel, with per-query error handling
  const results = await Promise.allSettled(
    queries.map((q) => safeFirecrawlSearch(q, { limit: 5, location: "US", tbs: "qdr:m" }))
  );

  const successful = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<any>).value);

  if (successful.length === 0) {
    return c.json({ error: "All search sources failed. Try again.", listings: [] });
  }

  // Deduplicate by address similarity, score by relevance, cache in session
  const deduplicated = deduplicateAndScore(successful.flat(), { city, max_rent, bedrooms });
  session.listings = deduplicated;
  return c.json({ listings: deduplicated });
});

export default app;
```

**Firecrawl features used:**
- `/search` with `location: "US"` for geo-relevant results
- `tbs: "qdr:m"` for listings from the past month (freshness)
- `limit: 5` per query to manage credits
- Parallel execution for speed

### 4.2 POST `/api/scrape-listing`

```typescript
// server/routes/scrape-listing.ts
import { Hono } from "hono";
import { firecrawl } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { LISTING_SCHEMA } from "../lib/schemas";

const app = new Hono();

app.post("/api/scrape-listing", async (c) => {
  const { session_id, url, extract_fields } = await c.req.json();
  const session = getOrCreateSession(session_id);

  // Check cache first to avoid duplicate Firecrawl calls
  if (session.scrapedUrls?.[url]) {
    return c.json(session.scrapedUrls[url]);
  }

  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["json", "markdown", "links"],
      jsonOptions: { schema: LISTING_SCHEMA },
    });
    // Cache result
    session.scrapedUrls = session.scrapedUrls || {};
    session.scrapedUrls[url] = result;
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: `Could not scrape this listing: ${e.message}`, url });
  }
});

export default app;
```

**Firecrawl features used:**
- `/scrape` with `formats: ["json"]` + JSON schema for structured extraction
- Also fetches `markdown` (for the agent to read) and `links` (to find related pages)
- Handles JS-rendered pages, proxies, anti-bot automatically

### 4.3 POST `/api/deep-dive`

```typescript
// server/routes/deep-dive.ts
import { Hono } from "hono";
import { firecrawl } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { extractDomain, filterRelevantPages } from "../lib/utils";

const app = new Hono();

app.post("/api/deep-dive", async (c) => {
  const { session_id, listing_url, search_query } = await c.req.json();
  const session = getOrCreateSession(session_id);

  try {
    // Step 1: Map the domain to find all related pages
    const domain = extractDomain(listing_url);
    const mapResults = await firecrawl.mapUrl(domain, {
      search: search_query || "floor plans pricing amenities",
      limit: 20,
    });

    // Step 2: Filter for relevant pages (floor plans, pricing, amenities)
    const relevantUrls = filterRelevantPages(mapResults.links ?? []);

    // Step 3: Scrape the most relevant pages (cap at 5 for credits)
    const scrapeResults = await Promise.allSettled(
      relevantUrls.slice(0, 5).map((url) =>
        firecrawl.scrapeUrl(url, { formats: ["markdown"] })
      )
    );

    const successful = scrapeResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    return c.json({ enriched_data: successful });
  } catch (e: any) {
    return c.json({
      error: `Deep dive failed for ${listing_url}: ${e.message}`,
      enriched_data: [],
    });
  }
});

export default app;
```

**Firecrawl features used:**
- `/map` with `search` parameter to find specific page types on a domain
- `/map` with `location` for geo-appropriate content
- Chained `/scrape` on discovered URLs for full content extraction

### 4.4 POST `/api/verify-neighborhood`

```typescript
// server/routes/verify-neighborhood.ts
import { Hono } from "hono";
import { safeFirecrawlSearch } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { synthesizeVerification } from "../lib/verification";

const app = new Hono();

app.post("/api/verify-neighborhood", async (c) => {
  const { session_id, address, building_name, check_types } = await c.req.json();
  const session = getOrCreateSession(session_id);
  const checks = (check_types || "reviews,safety,noise").split(",");

  const searchTasks: Promise<any>[] = [];
  const name = building_name || address;

  if (checks.includes("reviews")) {
    searchTasks.push(safeFirecrawlSearch(`"${name}" apartment reviews`, { limit: 5, tbs: "qdr:y" }));
  }
  if (checks.includes("safety")) {
    searchTasks.push(safeFirecrawlSearch(`${address} crime safety neighborhood`, { limit: 3 }));
  }
  if (checks.includes("noise")) {
    searchTasks.push(
      safeFirecrawlSearch(`"${name}" noise complaints`, { limit: 3, sources: ["web", "news"] })
    );
  }
  if (checks.includes("flooding")) {
    searchTasks.push(safeFirecrawlSearch(`${address} flood zone risk`, { limit: 2 }));
  }

  const results = await Promise.allSettled(searchTasks);
  const successful = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<any>).value);

  if (successful.length === 0) {
    return c.json({ error: "Could not verify neighborhood — search sources unavailable.", report: {} });
  }

  const report = synthesizeVerification(successful, checks);
  return c.json(report);
});

export default app;
```

**Firecrawl features used:**
- `/search` with `sources: ["web", "news"]` for both web results and news coverage
- `tbs: "qdr:y"` for reviews from the past year
- Parallel searches across multiple concern types

### 4.5 POST `/api/interact-page`

```typescript
// server/routes/interact-page.ts
import { Hono } from "hono";
import { firecrawl } from "../lib/firecrawl";

const app = new Hono();

app.post("/api/interact-page", async (c) => {
  const { session_id, url, action } = await c.req.json();

  try {
    // Step 1: Scrape to get session
    const result = await firecrawl.scrapeUrl(url, { formats: ["markdown"] });
    const scrapeId = result.metadata?.scrapeId;

    if (!scrapeId) {
      return c.json({ error: "Could not establish page session." });
    }

    // Step 2: Interact with the page
    const interaction = await firecrawl.interact(scrapeId, { prompt: action });

    // Step 3: Clean up session
    await firecrawl.stopInteraction(scrapeId);

    return c.json({
      result: interaction.output,
      live_view_url: interaction.liveViewUrl,
    });
  } catch (e: any) {
    return c.json({
      error: `Page interaction failed: ${e.message}. The listing may block automated access.`,
    });
  }
});

export default app;
```

**Firecrawl features used:**
- `/scrape` to establish session → get `scrapeId`
- `/interact` with natural language prompt to perform page actions
- Session cleanup with `stop_interaction`
- This is the most advanced Firecrawl feature — judges will notice

---

## 5. Frontend (Vite + React + ElevenLabs UI + shadcn/ui)

### 5.1 ElevenLabs UI Components Used

Install via CLI:
```bash
pnpm dlx @elevenlabs/cli@latest components add conversation
pnpm dlx @elevenlabs/cli@latest components add orb
pnpm dlx @elevenlabs/cli@latest components add waveform
pnpm dlx @elevenlabs/cli@latest components add transcript-viewer
pnpm dlx @elevenlabs/cli@latest components add voice-button
```

### 5.2 Layout
Two-panel layout:
- **Left (40%):** Voice conversation panel
  - `<Orb />` — interactive agent state visualization (listening, thinking, speaking)
  - `<Waveform />` or `<LiveWaveform />` — real-time audio visualization
  - `<TranscriptViewer />` — live transcript display
  - `<VoiceButton />` — mic toggle
  - Search status indicator (updated by `set_search_status` client tool)

- **Right (60%):** Research dashboard (shadcn/ui components)
  - Search status bar
  - Listing cards grid (populated by `add_listing_card` client tool)
  - Comparison table (populated by `update_comparison_table` client tool)
  - Warning banners (triggered by `show_warning` client tool)
  - Map view (extended goal — §9.2)

### 5.3 Client Tool Registration (React + ElevenLabs React SDK)

```typescript
// client/src/components/FlatScoutAgent.tsx
import { useConversation } from "@11labs/react";
import { useState, useCallback } from "react";
import type { Listing, Warning, SearchStatus } from "../lib/types";

const API_URL = import.meta.env.VITE_API_URL || "";

export function FlatScoutAgent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [rankedListings, setRankedListings] = useState<Listing[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({ status: "idle", message: "" });

  const conversation = useConversation({
    onMessage: (message) => {
      // Update transcript
    },
  });

  const startSession = useCallback(async () => {
    // Get signed URL from backend (keeps API key server-side)
    const res = await fetch(`${API_URL}/api/get-signed-url`);
    const { signedUrl } = await res.json();

    await conversation.startSession({
      signedUrl,
      dynamicVariables: {
        // system__conversation_id is auto-provided by ElevenLabs
      },
      clientTools: {
        add_listing_card: async (params: Record<string, any>) => {
          setListings((prev) => [
            ...prev,
            {
              id: params.listing_id,
              title: params.title,
              rent: params.rent,
              bedrooms: params.bedrooms,
              sqft: params.sqft,
              imageUrl: params.image_url,
              sourceUrl: params.source_url,
              sourceSite: params.source_site,
              highlights: params.highlights?.split(","),
              warnings: params.warnings?.split(","),
              score: params.score,
            },
          ]);
        },

        update_comparison_table: async (params: Record<string, any>) => {
          const parsed = JSON.parse(params.listings_json);
          setRankedListings(parsed);
        },

        show_warning: async (params: Record<string, any>) => {
          setWarnings((prev) => [
            ...prev,
            {
              listingId: params.listing_id,
              type: params.warning_type,
              message: params.message,
            },
          ]);
        },

        set_search_status: async (params: Record<string, any>) => {
          setSearchStatus({
            status: params.status,
            message: params.message,
          });
        },
      },
    });
  }, [conversation]);

  // Render: <Orb />, <VoiceButton />, <TranscriptViewer />, dashboard cards, etc.
}
```

---

## 6. Firecrawl Feature Coverage (for judges)

| Firecrawl Feature | How FlatScout Uses It |
|---|---|
| **Search** | Parallel multi-site listing discovery with location + time filters |
| **Search with scrapeOptions** | Single-call search + content extraction for initial listing scan |
| **Search categories** | Not used (rental-specific, not github/research) |
| **Search sources** | `["web", "news"]` for neighborhood verification |
| **Time-based search (tbs)** | `qdr:m` for fresh listings, `qdr:y` for review history |
| **Location filtering** | `location: "US"` for geo-relevant results |
| **Scrape** | Core listing data extraction from individual URLs |
| **Scrape JSON mode** | Structured extraction with rental-specific schema |
| **Scrape with formats** | `["json", "markdown", "links"]` for structured + raw + navigation |
| **Map** | Discover all pages on building/complex websites |
| **Map with search** | Find specific page types (floor plans, pricing, amenities) |
| **Interact** | Check availability, view dynamic pricing, explore listing pages |
| **Batch/parallel calls** | Multiple simultaneous searches across listing sites |

## 7. ElevenAgents Feature Coverage (for judges)

| ElevenAgents Feature | How FlatScout Uses It |
|---|---|
| **Conversational AI** | Core interaction model — full voice conversation |
| **Server Tools** | 5 tools calling FastAPI backend → Firecrawl |
| **Client Tools** | 4 tools pushing live data to React dashboard |
| **Tool Call Sounds** | Ambient audio during search/verification phases |
| **Dynamic Variables** | Per-conversation user preferences + `system__conversation_id` for session threading |
| **Expressive Mode** | Genuine excitement for good finds, concern for red flags |
| **LLM (Claude Sonnet 4)** | Drives tool-calling decisions and response quality |
| **React SDK** | Frontend integration with useConversation hook |
| **Multi-turn memory** | Remembers all findings across 5-10 min conversation |
| **Turn-taking / Interrupts** | User can redirect agent mid-search |
| **Error Handling Mode** | `tool_error_handling_mode: "summarized"` for graceful fallbacks |
| **Pre-tool Speech** | `force_pre_tool_speech: true` on long-running tools |

---

## 8. Demo Video Script (60-90 seconds)

### Hook (0-5s)
Text on screen: *"I told an AI to find me an apartment. It searched 4 sites, scraped 18 listings, caught 2 scams, and found my perfect place — in 6 minutes."*

### Demo (5-55s)
- Show the web app. User clicks mic.
- User says: "I need a 1-bedroom in Austin under $1,800. I have a dog. I work at the Domain."
- Quick cut to agent responding, confirming requirements.
- Show the dashboard: listing cards appearing one by one as agent narrates: "Found 18 listings... filtering to 11 pet-friendly ones..."
- Show a warning banner appearing: "This listing claims quiet neighborhood — I found 3 noise complaints in the last 6 months"
- Show the agent delivering the verdict: "My top pick is the Alexan at $1,650..."
- Show the final comparison table populated with 3 ranked options.

### Closer (55-65s)
User: "Can you check if unit 204 is still available?"
Agent: "Let me check..." [interact tool fires, ambient sound plays]
Agent: "Yes, unit 204 is available. Move-in April 15th."
Text: "FlatScout. Your AI finds the apartment. You just move in."
Tags: @firecrawl @elevenlabs #ElevenHacks

### Production Notes
- Record in coffee shop or living room (per guide: "take it outside")
- Add captions (CapCut)
- Background music: generate via ElevenLabs Music ("upbeat confident tech demo 100bpm")
- Post on X, LinkedIn, Instagram Reels, TikTok (vertical re-export)

---

## 9. Extended Goals (Revisit If Time Permits)

These features are designed and spec'd but deferred from the core MVP. Tackle them in order of impact if you finish the core build ahead of schedule.

### 9.1 Commute Time Calculation

**Why:** The user journey mentions filtering by commute ("7 are under 20 minutes") but the core MVP has no commute API. Without this, remove commute narration from the demo script.

**Implementation:**

#### New Server Tool: `calculate_commute`
```
Name: calculate_commute
Description: Calculate commute time from a listing address to the user's workplace. Call this after scraping a listing to add commute data.
Method: POST
URL: https://your-backend.com/api/calculate-commute
Body Parameters:
  - session_id (string, required): Conversation session ID
  - origin_address (string, required): Listing address
  - destination (string, required): User's workplace or reference point
  - mode (string, optional): "driving" (default), "transit", "walking", "bicycling"
```

#### New Backend Endpoint: `POST /api/calculate-commute`
```python
@app.post("/api/calculate-commute")
async def calculate_commute(session_id: str, origin_address: str,
                            destination: str, mode: str = "driving"):
    """
    Calculates commute time using Google Maps Distance Matrix API.
    Requires GOOGLE_MAPS_API_KEY env var.
    Free tier: $200/month credit (~40k requests).
    """
    import googlemaps
    gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))

    try:
        result = gmaps.distance_matrix(
            origins=[origin_address],
            destinations=[destination],
            mode=mode,
            departure_time="now"
        )
        element = result["rows"][0]["elements"][0]
        if element["status"] == "OK":
            return {
                "duration_text": element["duration"]["text"],
                "duration_seconds": element["duration"]["value"],
                "distance_text": element["distance"]["text"],
                "mode": mode
            }
        return {"error": f"Could not calculate route: {element['status']}"}
    except Exception as e:
        return {"error": f"Commute calculation failed: {str(e)}"}
```

**Alternatives (no API key):**
- **OSRM** — free, open-source, self-hostable. No traffic data but gives drive time estimates.
- **Mapbox Directions API** — 100k free requests/month.

**If implemented:** Add `calculate_commute` to the system prompt Phase 2 (SEARCH) and update `add_listing_card` client tool to include a `commute_time` field.

### 9.2 Map View

**Why:** Visual map of listings helps users understand geographic spread and proximity to their workplace.

**Implementation:**
- Add a map component using **Mapbox GL JS** (free tier: 50k loads/month) or **Leaflet + OpenStreetMap** (fully free)
- Plot each listing as a pin with rent as the label
- Highlight the user's workplace/reference point
- Color-code pins by score (green = top pick, yellow = decent, red = flagged)
- New client tool:

```
Name: add_map_pin
Description: Add a pin to the map view for a listing.
Parameters:
  - listing_id (string): Unique ID matching the listing card
  - lat (number): Latitude
  - lng (number): Longitude
  - label (string): Display label (e.g. "$1,650 — Alexan")
  - color (string): Pin color — "green", "yellow", "red"
Wait for response: false
```

**Note:** Lat/lng can be extracted during `scrape_listing` (add to JSON schema) or geocoded from the address using Google Geocoding API / OpenStreetMap Nominatim (free).

### 9.3 Session Persistence (Database)

**Why:** In-memory session store is fine for MVP/demo but loses data on server restart.

**Implementation:** Replace in-memory Map with Drizzle ORM + PostgreSQL (already running in Docker on the same Droplet). Tables: `sessions`, `listings_cache`, `search_history`. Low priority — only matters if you want multi-session history or the demo crashes mid-conversation.

### 9.4 Save & Share Shortlist

**Why:** Let users save the final shortlist as a shareable link or PDF.

**Implementation:** Generate a unique URL with the session's ranked listings. Simple — just a GET endpoint that renders the comparison table as a static page.

---

## 10. Three-Day Build Plan

### Day 1: Core Pipeline
- [ ] Scaffold monorepo: Vite React frontend (`client/`) + Hono backend (`server/`)
- [ ] Set up 5 Hono API routes under `server/routes/*` + `GET /api/get-signed-url`
- [ ] Implement `server/lib/firecrawl.ts` (Firecrawl JS SDK wrapper + `safeFirecrawlSearch` helper)
- [ ] Implement `server/lib/session.ts` (in-memory session store with `getOrCreateSession`)
- [ ] Configure Hono to serve Vite build as static files (SPA fallback)
- [ ] Get Firecrawl API key, test /search and /scrape with real listing URLs
- [ ] Test `site:zillow.com` and `site:apartments.com` queries in Firecrawl — confirmed supported
- [ ] Create ElevenLabs agent with system prompt + 5 server tools + error handling config
- [ ] Configure `tool_error_handling_mode: "summarized"` and `force_pre_tool_speech: true` on agent
- [ ] Test end-to-end: voice → agent → tool call → Firecrawl → response
- [ ] Verify the agent correctly chains: search → scrape → narrate
- [ ] Pre-test Firecrawl `/interact` on Zillow, Apartments.com — assess reliability for demo

### Day 2: Frontend + Polish
- [ ] Install ElevenLabs UI components via `@elevenlabs/cli` (Conversation, Orb, Waveform, TranscriptViewer, VoiceButton)
- [ ] Build two-panel layout with voice panel (left) + research dashboard (right)
- [ ] Implement signed URL flow: frontend calls `/api/get-signed-url` → starts session
- [ ] Register 4 client tools, verify listing cards appear in real-time
- [ ] Build comparison table component (shadcn/ui Table)
- [ ] Add warning banner component (shadcn/ui Alert)
- [ ] Add search status indicator
- [ ] Test with 2-3 different city searches to ensure reliability
- [ ] Add tool call sounds
- [ ] Set up DigitalOcean Droplet: Docker Compose (Hono app + Postgres)
- [ ] Deploy to Droplet with Caddy for automatic HTTPS
- [ ] Pre-warm cache for demo scenario (Austin, 1BR, $1800)
- [ ] **If time:** Tackle Extended Goals §9.1 (commute) or §9.2 (map view)

### Day 3: Video + Social (MOST IMPORTANT DAY)
- [ ] Script the demo (follow script above — adjust commute narration based on whether §9.1 was implemented)
- [ ] Practice 2-3 dry runs to nail the timing
- [ ] Record the demo (screen recording + voiceover or live narration)
- [ ] Include one 15-20s uncut segment showing real-time tool use (cards appearing + warning popping up)
- [ ] Edit in CapCut: captions, music (ElevenLabs Music), tight cuts
- [ ] Re-export in 9:16 vertical for Reels/TikTok
- [ ] Write platform-specific posts
- [ ] Post on all 4 platforms: X, LinkedIn, Instagram, TikTok
- [ ] Upload submission on ElevenHacks with repo link + demo URL

---

## 11. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Listing sites blocking Firecrawl | Use Firecrawl's built-in proxy rotation; test specific sites before demo day; have fallback sites ready |
| Firecrawl `/interact` unreliable | Make it optional — demo it if it works, skip if not. Core flow works without it. |
| Agent narrates too slowly | Tune system prompt for brevity. "Never speak for more than 15 seconds without acting." |
| Credits run out during demo | Implement per-session budget cap in backend. Cache aggressively. Pre-warm cache for demo scenario. |
| Listing data is messy/incomplete | JSON extraction schema handles most cases. Fallback to markdown parsing if JSON mode misses fields. |
| Demo city has few listings | Pre-test with Austin, Denver, Raleigh — mid-size cities with high rental volume on Zillow/Apartments.com |