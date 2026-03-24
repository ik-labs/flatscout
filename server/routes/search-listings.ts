import { Hono } from "hono";
import { safeFirecrawlSearch } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { deduplicateAndScore } from "../lib/utils";

const app = new Hono();

app.post("/api/search-listings", async (c) => {
  const { session_id, city, max_rent, bedrooms, pet_friendly, keywords } =
    await c.req.json();

  if (!session_id || !city || !max_rent || !bedrooms) {
    return c.json(
      { error: "Missing required fields: session_id, city, max_rent, bedrooms" },
      400
    );
  }

  const session = getOrCreateSession(session_id);

  const queries = [
    `${bedrooms}BR apartment ${city} under $${max_rent} ${keywords || ""} site:zillow.com`,
    `${bedrooms} bedroom apartment ${city} under $${max_rent} ${keywords || ""} site:apartments.com`,
    `${bedrooms}BR ${city} $${max_rent} ${keywords || ""} site:craigslist.org`,
    `${bedrooms} bedroom ${city} rent under $${max_rent} ${keywords || ""} site:redfin.com`,
  ];

  // Fire all searches in parallel, with per-query error handling
  const results = await Promise.allSettled(
    queries.map((q) =>
      safeFirecrawlSearch(q, { limit: 5, location: "US", tbs: "qdr:m" })
    )
  );

  const successful = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<any>).value)
    .filter(Boolean);

  if (successful.length === 0) {
    return c.json({
      error: "All search sources failed. Try again.",
      listings: [],
    });
  }

  // Deduplicate by address similarity, score by relevance, cache in session
  const deduplicated = deduplicateAndScore(successful.flat(), {
    city,
    max_rent,
    bedrooms,
  });
  session.listings = deduplicated;
  return c.json({ listings: deduplicated });
});

export default app;
