import { Hono } from "hono";
import { firecrawl } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { LISTING_SCHEMA } from "../lib/schemas";

const app = new Hono();

app.post("/api/scrape-listing", async (c) => {
  const { session_id, url, extract_fields } = await c.req.json();

  if (!session_id || !url) {
    return c.json({ error: "Missing required fields: session_id, url" }, 400);
  }

  const session = getOrCreateSession(session_id);

  // Check cache first to avoid duplicate Firecrawl calls
  if (session.scrapedUrls?.[url]) {
    return c.json(session.scrapedUrls[url]);
  }

  try {
    const result = await firecrawl.scrape(url, {
      formats: [
        { type: "json", schema: LISTING_SCHEMA },
        "markdown",
        "links",
      ],
    });
    // Cache result
    session.scrapedUrls = session.scrapedUrls || {};
    session.scrapedUrls[url] = result;
    return c.json(result);
  } catch (e: any) {
    return c.json(
      { error: `Could not scrape this listing: ${e.message}`, url },
      502
    );
  }
});

export default app;
