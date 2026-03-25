import { Hono } from "hono";
import { safeFirecrawlExtract, firecrawl } from "../lib/firecrawl";
import { LISTING_SCHEMA } from "../lib/schemas";
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

  getOrCreateSession(session_id);

  try {
    const domain = extractDomain(listing_url);
    const mapResults = await firecrawl.map(domain, {
      search: search_query || "floor plans pricing amenities pet policy parking lease terms availability",
      limit: 20,
    });

    const allUrls = (mapResults.links ?? [])
      .map((link: unknown) =>
        typeof link === "string"
          ? link
          : link && typeof link === "object" && "url" in link
            ? String((link as { url: unknown }).url)
            : ""
      )
      .filter(Boolean);

    const relevantUrls = filterRelevantPages(allUrls);
    const urlsToAnalyze = [listing_url, ...relevantUrls].filter(
      (url, index, array) => array.indexOf(url) === index
    ).slice(0, 6);

    const extracted = await safeFirecrawlExtract({
      urls: urlsToAnalyze,
      prompt:
        "Extract apartment building details relevant to renters, especially fees, pet policy, parking, lease terms, availability, floor plans, amenities, and qualification requirements.",
      schema: LISTING_SCHEMA,
      enableWebSearch: true,
      showSources: true,
      timeout: 45,
      scrapeOptions: {
        onlyMainContent: true,
        formats: ["markdown"],
        timeout: 15000,
      },
    });

    const structured =
      extracted && typeof extracted === "object" && "data" in extracted
        ? (extracted.data as Record<string, unknown>)
        : {};

    return c.json({
      listing_url,
      analyzed_urls: urlsToAnalyze,
      structured_data: structured,
    });
  } catch (e: any) {
    return c.json({
      error: `Deep dive failed for ${listing_url}: ${e.message}`,
      structured_data: {},
    });
  }
});

export default app;
