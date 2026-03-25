import { Hono } from "hono";
import { safeFirecrawlAgent, safeFirecrawlExtract, safeFirecrawlSearch } from "../lib/firecrawl";
import { DISCOVERY_LISTINGS_SCHEMA } from "../lib/schemas";
import { getOrCreateSession } from "../lib/session";
import {
  buildAgentPrompt,
  buildExtractPrompt,
  buildSearchQueries,
  expandTargetCities,
  extractStructuredListings,
  fuseAndRankListings,
  normalizeSearchListings,
  normalizeStructuredListings,
  type SearchCriteria,
} from "../lib/retrieval";

const app = new Hono();
const MIN_STRONG_MATCHES = 3;

async function runRetrievalPass(criteria: SearchCriteria) {
  const targets = expandTargetCities(criteria.city, criteria.broadened);
  const searchJobs = targets.flatMap((target) =>
    buildSearchQueries(target, criteria).map((query) => ({
      query,
      location: target.location,
    }))
  );

  const searchResults = await Promise.all(
    searchJobs.map((job) =>
      safeFirecrawlSearch(job.query, {
        limit: 4,
        location: job.location,
        country: "US",
        tbs: "qdr:m",
        timeout: 30000,
        ignoreInvalidURLs: true,
        scrapeOptions: {
          formats: ["markdown", "summary"],
          onlyMainContent: true,
          timeout: 15000,
        },
      })
    )
  );
  const rawSearchResults = searchResults.flatMap((result) => result ?? []);
  const seedUrls = Array.from(
    new Set(
      rawSearchResults
        .map((result) => (result && typeof result.url === "string" ? result.url : ""))
        .filter(Boolean)
    )
  ).slice(0, 8);

  const extractPromise = safeFirecrawlExtract({
    urls: seedUrls,
    prompt: buildExtractPrompt(targets, criteria),
    schema: DISCOVERY_LISTINGS_SCHEMA,
    enableWebSearch: true,
    showSources: true,
    timeout: 45,
    scrapeOptions: {
      onlyMainContent: true,
      formats: ["markdown"],
      timeout: 15000,
    },
  });

  const agentPromise = safeFirecrawlAgent({
    urls: seedUrls,
    prompt: buildAgentPrompt(targets, criteria),
    schema: DISCOVERY_LISTINGS_SCHEMA,
    model: "spark-1-mini",
    maxCredits: 600,
    timeout: 45,
  });

  const [extractResults, agentResults] = await Promise.all([extractPromise, agentPromise]);

  const normalizedSearch = normalizeSearchListings(
    rawSearchResults,
    criteria,
    targets
  );
  const normalizedExtract = normalizeStructuredListings(
    extractStructuredListings(extractResults),
    "extract",
    criteria,
    targets
  );
  const normalizedAgent = normalizeStructuredListings(
    extractStructuredListings(agentResults),
    "agent",
    criteria,
    targets
  );

  const listings = fuseAndRankListings(
    normalizedSearch,
    normalizedExtract,
    normalizedAgent,
    criteria,
    targets
  );

  return {
    criteria,
    targets,
    listings,
    counts: {
      searchCandidates: normalizedSearch.length,
      extractCandidates: normalizedExtract.length,
      agentCandidates: normalizedAgent.length,
    },
  };
}

app.post("/api/search-listings", async (c) => {
  const { session_id, city, max_rent, bedrooms, pet_friendly, keywords } =
    await c.req.json();

  if (!session_id || !city || !max_rent || bedrooms === undefined || bedrooms === null) {
    return c.json(
      { error: "Missing required fields: session_id, city, max_rent, bedrooms" },
      400
    );
  }

  const session = getOrCreateSession(session_id);
  const strictCriteria: SearchCriteria = {
    city,
    maxRent: Number(max_rent),
    bedrooms: Number(bedrooms),
    petFriendly: Boolean(pet_friendly),
    keywords: typeof keywords === "string" ? keywords : "",
    broadened: false,
  };

  const strictPass = await runRetrievalPass(strictCriteria);
  let finalPass = strictPass;
  let broadened = false;

  if (strictPass.listings.length < MIN_STRONG_MATCHES) {
    const broadenedCriteria: SearchCriteria = {
      ...strictCriteria,
      maxRent: Math.round(strictCriteria.maxRent * 1.1),
      broadened: true,
    };

    const broaderPass = await runRetrievalPass(broadenedCriteria);
    if (broaderPass.listings.length > strictPass.listings.length) {
      finalPass = broaderPass;
      broadened = true;
    }
  }

  const finalListings = finalPass.listings.slice(0, 10).map((listing, index) => ({
    ...listing,
    id: `listing-${index + 1}`,
  }));

  session.listings = finalListings;

  return c.json({
    listings: finalListings,
    retrieval_summary: {
      broadened,
      target_cities: finalPass.targets.map((target) => target.name),
      counts: finalPass.counts,
      summary: `Merged ${finalPass.counts.searchCandidates} search, ${finalPass.counts.extractCandidates} extract, and ${finalPass.counts.agentCandidates} agent candidates into ${finalListings.length} ranked listings.`,
    },
  });
});

export default app;
