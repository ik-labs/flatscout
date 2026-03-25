import { Hono } from "hono";
import { safeFirecrawlSearch } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import {
  buildSearchQueries,
  expandTargetCities,
  filterSearchResults,
  fuseAndRankListings,
  normalizeSearchListings,
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
        timeout: 15000,
        ignoreInvalidURLs: true,
      })
    )
  );
  const rawSearchResults = searchResults.flatMap((result) => result ?? []);
  const filteredSearchResults = filterSearchResults(rawSearchResults);

  const normalizedSearch = normalizeSearchListings(
    filteredSearchResults,
    criteria,
    targets
  );
  const listings = fuseAndRankListings(
    normalizedSearch,
    [],
    [],
    criteria,
    targets
  );

  return {
    criteria,
    targets,
    listings,
    counts: {
      searchCandidates: normalizedSearch.length,
      extractCandidates: 0,
      agentCandidates: 0,
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
      summary: `Ranked ${finalListings.length} listings from ${finalPass.counts.searchCandidates} filtered search candidates across ${finalPass.targets.length} target cities.`,
    },
  });
});

export default app;
