import { Hono } from "hono";
import { firecrawl } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { extractDomain, filterRelevantPages } from "../lib/utils";

const app = new Hono();

app.post("/api/deep-dive", async (c) => {
  const { session_id, listing_url, search_query } = await c.req.json();

  if (!session_id || !listing_url) {
    return c.json(
      { error: "Missing required fields: session_id, listing_url" },
      400
    );
  }

  const session = getOrCreateSession(session_id);

  try {
    // Step 1: Map the domain to find all related pages
    const domain = extractDomain(listing_url);
    const mapResults = await firecrawl.map(domain, {
      search: search_query || "floor plans pricing amenities",
      limit: 20,
    });

    // Step 2: Extract URLs and filter for relevant pages
    const allUrls = (mapResults.links ?? []).map((link: any) =>
      typeof link === "string" ? link : link.url
    ).filter(Boolean) as string[];
    const relevantUrls = filterRelevantPages(allUrls);

    // Step 3: Scrape the most relevant pages (cap at 5 for credits)
    const scrapeResults = await Promise.allSettled(
      relevantUrls.slice(0, 5).map((url) =>
        firecrawl.scrape(url, { formats: ["markdown"] })
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
