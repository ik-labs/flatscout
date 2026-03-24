import type { Listing } from "./types";

/**
 * Extract the root domain from a URL.
 * e.g. "https://www.apartments.com/foo/bar" → "https://www.apartments.com"
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return url;
  }
}

/**
 * Filter a list of URLs to only those likely to contain floor plans,
 * pricing, amenities, or other useful apartment details.
 */
export function filterRelevantPages(urls: string[]): string[] {
  const relevantPatterns = [
    /floor[-_\s]?plan/i,
    /pricing/i,
    /ameniti/i,
    /features/i,
    /photos/i,
    /gallery/i,
    /availability/i,
    /specials/i,
    /virtual[-_\s]?tour/i,
    /pet[-_\s]?polic/i,
  ];

  return urls.filter((url) =>
    relevantPatterns.some((pattern) => pattern.test(url))
  );
}

/**
 * Deduplicate listings by URL similarity and score them by relevance
 * to the user's search criteria.
 */
export function deduplicateAndScore(
  rawResults: any[],
  criteria: { city: string; max_rent: number; bedrooms: number }
): Listing[] {
  if (!rawResults || rawResults.length === 0) return [];

  const seen = new Set<string>();
  const deduplicated: Listing[] = [];

  for (const item of rawResults) {
    if (!item?.url) continue;

    // Normalize URL for dedup
    const normalizedUrl = item.url.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    const listing: Listing = {
      id: `listing-${deduplicated.length + 1}`,
      title: item.title || item.metadata?.title || "Untitled Listing",
      url: item.url,
      sourceSite: extractSourceSite(item.url),
      address: item.metadata?.address,
      city: criteria.city,
      rent: parseRent(item.title, item.description),
      bedrooms: criteria.bedrooms,
      sqft: parseSqft(item.title, item.description),
      imageUrl: item.metadata?.ogImage,
      highlights: [],
      warnings: [],
      score: 0,
    };

    // Score the listing
    listing.score = scoreListing(listing, criteria);
    deduplicated.push(listing);
  }

  // Sort by score descending
  deduplicated.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return deduplicated;
}

function extractSourceSite(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("zillow")) return "Zillow";
    if (hostname.includes("apartments.com")) return "Apartments.com";
    if (hostname.includes("craigslist")) return "Craigslist";
    if (hostname.includes("redfin")) return "Redfin";
    if (hostname.includes("realtor")) return "Realtor.com";
    if (hostname.includes("trulia")) return "Trulia";
    return hostname;
  } catch {
    return "Unknown";
  }
}

function parseRent(title?: string, description?: string): number | undefined {
  const text = `${title || ""} ${description || ""}`;
  const match = text.match(/\$\s?([\d,]+)/);
  if (match) {
    const val = parseInt(match[1].replace(",", ""), 10);
    // Sanity check: rent should be between $200 and $20,000
    if (val >= 200 && val <= 20000) return val;
  }
  return undefined;
}

function parseSqft(title?: string, description?: string): number | undefined {
  const text = `${title || ""} ${description || ""}`;
  const match = text.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i);
  if (match) {
    return parseInt(match[1].replace(",", ""), 10);
  }
  return undefined;
}

function scoreListing(
  listing: Listing,
  criteria: { city: string; max_rent: number; bedrooms: number }
): number {
  let score = 50; // Base score

  // Rent within budget
  if (listing.rent) {
    if (listing.rent <= criteria.max_rent) {
      score += 20;
      // Bonus for being well under budget
      if (listing.rent <= criteria.max_rent * 0.85) score += 10;
    } else {
      score -= 20;
    }
  }

  // Source reliability bonus
  const reliableSources = ["Zillow", "Apartments.com", "Redfin", "Realtor.com"];
  if (reliableSources.includes(listing.sourceSite)) {
    score += 10;
  }

  // Has square footage info
  if (listing.sqft && listing.sqft > 0) score += 5;

  // Has image
  if (listing.imageUrl) score += 5;

  return Math.min(100, Math.max(0, score));
}
