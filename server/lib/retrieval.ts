import type { Listing } from "./types";

export interface SearchCriteria {
  city: string;
  maxRent: number;
  bedrooms: number;
  petFriendly?: boolean;
  keywords?: string;
  broadened?: boolean;
}

export interface TargetCity {
  name: string;
  location: string;
  nearby: string[];
}

interface InternalListing extends Listing {
  rawText?: string;
}

const CITY_CONFIG: Record<string, TargetCity> = {
  "san jose": {
    name: "San Jose",
    location: "San Jose,California,United States",
    nearby: ["Santa Clara", "Sunnyvale", "Mountain View", "Campbell"],
  },
  "santa clara": {
    name: "Santa Clara",
    location: "Santa Clara,California,United States",
    nearby: ["San Jose", "Sunnyvale", "Mountain View", "Cupertino"],
  },
  sunnyvale: {
    name: "Sunnyvale",
    location: "Sunnyvale,California,United States",
    nearby: ["Santa Clara", "Mountain View", "Cupertino", "San Jose"],
  },
  "mountain view": {
    name: "Mountain View",
    location: "Mountain View,California,United States",
    nearby: ["Sunnyvale", "Santa Clara", "Cupertino", "Palo Alto"],
  },
  cupertino: {
    name: "Cupertino",
    location: "Cupertino,California,United States",
    nearby: ["Sunnyvale", "Santa Clara", "Mountain View", "San Jose"],
  },
  campbell: {
    name: "Campbell",
    location: "Campbell,California,United States",
    nearby: ["San Jose", "Santa Clara"],
  },
  "san francisco": {
    name: "San Francisco",
    location: "San Francisco,California,United States",
    nearby: ["South San Francisco", "Daly City", "San Bruno"],
  },
  austin: {
    name: "Austin",
    location: "Austin,Texas,United States",
    nearby: ["Round Rock", "Cedar Park", "Pflugerville"],
  },
  "round rock": {
    name: "Round Rock",
    location: "Round Rock,Texas,United States",
    nearby: ["Austin", "Cedar Park"],
  },
  "cedar park": {
    name: "Cedar Park",
    location: "Cedar Park,Texas,United States",
    nearby: ["Austin", "Round Rock"],
  },
};

const REGION_ALIASES: Record<string, string[]> = {
  "silicon valley": ["San Jose", "Santa Clara", "Sunnyvale", "Mountain View"],
  "bay area": ["San Francisco", "San Jose", "Santa Clara", "Sunnyvale"],
};

const SOURCE_PRIORITY: Record<string, number> = {
  search: 1,
  extract: 2,
  agent: 3,
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return undefined;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "string" ? [item] : JSON.stringify(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function objectEntriesToStrings(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== null && entry !== undefined && `${entry}`.trim() !== "")
    .map(([key, entry]) => `${titleCase(key.replace(/_/g, " "))}: ${String(entry)}`);
}

function normalizeUrl(url: string | undefined) {
  if (!url) return "";
  return url.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
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

function parseRent(text: string): number | undefined {
  const matches = [...text.matchAll(/\$\s?([\d,]{3,6})/g)]
    .map((match) => Number.parseInt(match[1].replace(/,/g, ""), 10))
    .filter((value) => value >= 200 && value <= 20000);
  return matches[0];
}

function parseBedrooms(text: string): number | undefined {
  const numeric = text.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  if (numeric) return Number(numeric[1]);

  const words: Record<string, number> = {
    studio: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
  };

  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}[\\s-]*(?:bed|br|bedroom)`, "i").test(text)) {
      return value;
    }
  }

  return undefined;
}

function parseSqft(text: string): number | undefined {
  const match = text.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i);
  return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : undefined;
}

function parseBathrooms(text: string): number | undefined {
  const numeric = text.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
  return numeric ? Number(numeric[1]) : undefined;
}

function parseCityCandidate(value: unknown, targets: TargetCity[]) {
  if (typeof value !== "string") return undefined;
  return detectCity(value, targets);
}

function canonicalListingKey(listing: InternalListing) {
  if (listing.url) return normalizeUrl(listing.url);
  if (listing.address) return listing.address.toLowerCase();
  return `${listing.title}-${listing.city || ""}`.toLowerCase().replace(/\s+/g, "-");
}

function pickBetterString(current: string | undefined, next: string | undefined) {
  if (!next?.trim()) return current;
  if (!current?.trim()) return next;
  return next.length > current.length ? next : current;
}

function pickBetterNumber(current: number | undefined, next: number | undefined) {
  if (next === undefined) return current;
  if (current === undefined) return next;
  return current;
}

function mergeArrays(current?: string[], next?: string[]) {
  return unique([...(current ?? []), ...(next ?? [])]).filter(Boolean);
}

function detectCity(text: string, targets: TargetCity[]): string | undefined {
  const lower = text.toLowerCase();
  for (const target of targets) {
    if (lower.includes(target.name.toLowerCase())) {
      return target.name;
    }
  }
  const known = Object.values(CITY_CONFIG);
  for (const city of known) {
    if (lower.includes(city.name.toLowerCase())) {
      return city.name;
    }
  }
  return undefined;
}

function getRequirementFlags(criteria: SearchCriteria) {
  const keywords = (criteria.keywords || "").toLowerCase();
  return {
    requiresParking: /\bparking|garage|carport\b/.test(keywords),
    requiresInUnitLaundry:
      /in[-\s]?unit laundry|washer\/dryer|washer and dryer|laundry in unit/.test(keywords),
    prefersQuiet: /\bquiet|low noise|noisy\b/.test(keywords),
  };
}

function matchesAllowedCity(listing: InternalListing, targets: TargetCity[]) {
  const allowed = new Set(targets.map((target) => target.name.toLowerCase()));
  const listingCity = listing.city?.toLowerCase();
  if (listingCity && allowed.has(listingCity)) return true;
  const text = `${listing.title} ${listing.address || ""} ${listing.rawText || ""}`.toLowerCase();
  for (const target of targets) {
    if (text.includes(target.name.toLowerCase())) return true;
  }
  return false;
}

function mentionsDisallowedKnownCity(listing: InternalListing, targets: TargetCity[]) {
  const allowed = new Set(targets.map((target) => target.name.toLowerCase()));
  const text = `${listing.title} ${listing.address || ""} ${listing.rawText || ""}`.toLowerCase();
  for (const city of Object.values(CITY_CONFIG)) {
    const name = city.name.toLowerCase();
    if (!allowed.has(name) && text.includes(name)) {
      return true;
    }
  }
  return false;
}

function hardRejectReason(listing: InternalListing, criteria: SearchCriteria, targets: TargetCity[]) {
  const text = `${listing.title} ${listing.address || ""} ${listing.rawText || ""} ${listing.petPolicy || ""} ${listing.parking || ""} ${listing.laundry || ""}`.toLowerCase();
  const normalizedUrl = normalizeUrl(listing.url);
  const requirements = getRequirementFlags(criteria);
  const explicitBedrooms = listing.bedrooms ?? parseBedrooms(text);

  if (
    /(sold|for sale|purchase price|zestimate|mortgage|open house|mls#|homes for sale)/i.test(text)
  ) {
    return "non-rental";
  }

  if (
    /(apartments for rent in|sublets? & temporary|housing\b)/i.test(text) ||
    /\/search\//.test(normalizedUrl) ||
    /\/sub(?:\/|$)/.test(normalizedUrl) ||
    /\/\d+_p\/?$/.test(normalizedUrl)
  ) {
    return "directory-page";
  }

  if (explicitBedrooms !== undefined && explicitBedrooms !== criteria.bedrooms) {
    return "wrong-bedroom";
  }

  if (!matchesAllowedCity(listing, targets) && mentionsDisallowedKnownCity(listing, targets)) {
    return "wrong-city";
  }

  if (criteria.petFriendly && /\bno pets\b|\bnot pet friendly\b/.test(text)) {
    return "not-pet-friendly";
  }

  if (requirements.requiresInUnitLaundry) {
    const hasInUnit = /\bin[-\s]?unit\b|\bwasher\/dryer\b|\bfull-size washer and dryer\b/.test(text);
    const hasShared = /\bshared laundry\b|\bon-site laundry\b|\bcommunity laundry\b|\bcommon laundry\b/.test(text);
    if (hasShared && !hasInUnit) {
      return "shared-laundry";
    }
  }

  if (listing.rent !== undefined && listing.rent > criteria.maxRent && !criteria.broadened) {
    return "over-budget";
  }

  return null;
}

function sourceQuality(sourceSite: string) {
  if (["Zillow", "Apartments.com", "Redfin", "Realtor.com"].includes(sourceSite)) return 10;
  if (sourceSite === "Craigslist") return 4;
  return 2;
}

function completenessScore(listing: InternalListing) {
  const fields = [
    listing.address,
    listing.rent,
    listing.sqft,
    listing.petPolicy,
    listing.parking,
    listing.laundry,
    listing.availabilitySummary?.length,
    listing.feesBreakdown?.length,
    listing.floorPlans?.length,
    listing.leaseTermsDetail?.length,
    listing.amenitiesDetail?.length,
  ];
  return fields.filter(Boolean).length * 2;
}

function scoreListing(listing: InternalListing, criteria: SearchCriteria, targets: TargetCity[]) {
  const requirements = getRequirementFlags(criteria);
  const text = `${listing.title} ${listing.address || ""} ${listing.rawText || ""} ${listing.petPolicy || ""} ${listing.parking || ""} ${listing.laundry || ""}`.toLowerCase();
  let score = 35;

  if (matchesAllowedCity(listing, targets)) score += 24;
  else if (criteria.broadened && listing.city) score += 10;

  if (listing.rent !== undefined) {
    if (listing.rent <= criteria.maxRent) {
      score += 18;
      if (listing.rent <= criteria.maxRent * 0.9) score += 5;
    } else if (criteria.broadened && listing.rent <= criteria.maxRent * 1.1) {
      score += 6;
    } else {
      score -= 10;
    }
  }

  if (criteria.petFriendly) {
    if (/\bpet[-\s]?friendly\b|\bdogs?\b|\bcats?\b/.test(text)) score += 14;
  }

  if (requirements.requiresParking) {
    if (/\bparking\b|\bgarage\b|\bcarport\b/.test(text)) score += 12;
    if (/\bno parking\b/.test(text)) score -= 6;
  }

  if (requirements.requiresInUnitLaundry) {
    if (/\bin[-\s]?unit\b|\bwasher\/dryer\b/.test(text)) score += 15;
    if (/\bshared laundry\b|\bon-site laundry\b/.test(text)) score -= 8;
  }

  if (requirements.prefersQuiet) {
    if (/\bquiet\b|\blow noise\b|\bpeaceful\b/.test(text)) score += 10;
    if (/\bnoise\b|\bnoisy\b|\bfire station\b|\bbusy road\b/.test(text)) score -= 8;
  }

  score += sourceQuality(listing.sourceSite);
  score += Math.min(16, completenessScore(listing));

  return Math.max(0, Math.min(100, score));
}

function buildHighlights(listing: InternalListing) {
  const highlights = listing.highlights ?? [];
  const text = `${listing.petPolicy || ""} ${listing.parking || ""} ${listing.laundry || ""}`.toLowerCase();

  if (/\bpet[-\s]?friendly\b|\bdogs?\b|\bcats?\b/.test(text)) highlights.push("Pet-friendly");
  if (/\bparking\b|\bgarage\b|\bcarport\b/.test(text)) highlights.push("Parking available");
  if (/\bin[-\s]?unit\b|\bwasher\/dryer\b/.test(text)) highlights.push("In-unit washer/dryer");
  if (listing.availabilitySummary?.length) highlights.push("Availability verified");

  return unique(highlights).slice(0, 6);
}

function formatFloorPlans(rawFloorPlans: unknown): string[] {
  if (!Array.isArray(rawFloorPlans)) return [];
  return rawFloorPlans
    .map((plan) => {
      if (!plan || typeof plan !== "object") return String(plan);
      const record = plan as Record<string, unknown>;
      const parts = [
        record.name ? String(record.name) : undefined,
        record.rent_range ? String(record.rent_range) : undefined,
        record.sqft_range ? String(record.sqft_range) : undefined,
        record.available ? String(record.available) : undefined,
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter(Boolean);
}

function normalizeStructuredListing(
  raw: Record<string, unknown>,
  source: "extract" | "agent",
  criteria: SearchCriteria,
  targets: TargetCity[]
): InternalListing {
  const textBlob = JSON.stringify(raw);
  const city = parseCityCandidate(raw.city, targets) || detectCity(textBlob, targets);
  const title = String(raw.name || raw.title || raw.property_name || "Untitled Listing");
  const url = typeof raw.url === "string" ? raw.url : typeof raw.source_url === "string" ? raw.source_url : "";
  const feesBreakdown = [
    ...toStringArray(raw.fees_breakdown),
    ...objectEntriesToStrings(raw.fees_breakdown),
  ];

  return {
    id: `${source}-${Math.random().toString(36).slice(2, 10)}`,
    title,
    url,
    sourceSite: typeof raw.source_site === "string" ? raw.source_site : source,
    rent: toNumber(raw.rent),
    bedrooms: toNumber(raw.bedrooms),
    bathrooms: toNumber(raw.bathrooms),
    sqft: toNumber(raw.sqft),
    address: typeof raw.address === "string" ? raw.address : undefined,
    city,
    imageUrl: typeof raw.image_url === "string" ? raw.image_url : undefined,
    petPolicy: typeof raw.pet_policy === "string" ? raw.pet_policy : undefined,
    parking: typeof raw.parking === "string" ? raw.parking : undefined,
    laundry: typeof raw.laundry === "string" ? raw.laundry : undefined,
    moveInDate: typeof raw.move_in_date === "string" ? raw.move_in_date : undefined,
    availabilitySummary: [
      ...toStringArray(raw.availability_summary),
      ...(typeof raw.availability_summary === "string" ? [raw.availability_summary] : []),
    ],
    floorPlans: formatFloorPlans(raw.floor_plans),
    feesBreakdown,
    petDetails: toStringArray(raw.pet_details),
    parkingDetails: toStringArray(raw.parking_details),
    leaseTermsDetail: toStringArray(raw.lease_terms_detail),
    amenitiesDetail: [
      ...toStringArray(raw.amenities_detail),
      ...toStringArray(raw.amenities),
    ],
    qualificationRequirements: toStringArray(raw.qualification_requirements),
    sourceProvenance: unique([source, ...toStringArray(raw.source_provenance)]),
    verificationSummary: toStringArray(raw.verification_summary),
    quietNotes: toStringArray(raw.quiet_notes),
    highlights: buildHighlights({
      id: "",
      title,
      url,
      sourceSite: source,
      rent: toNumber(raw.rent),
      bedrooms: toNumber(raw.bedrooms),
      rawText: textBlob,
      petPolicy: typeof raw.pet_policy === "string" ? raw.pet_policy : undefined,
      parking: typeof raw.parking === "string" ? raw.parking : undefined,
      laundry: typeof raw.laundry === "string" ? raw.laundry : undefined,
      availabilitySummary: toStringArray(raw.availability_summary),
    }),
    warnings: [],
    score: 0,
    rawText: textBlob,
  };
}

function normalizeSearchResult(
  raw: Record<string, unknown>,
  criteria: SearchCriteria,
  targets: TargetCity[]
): InternalListing {
  const metadata =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const title = String(raw.title || metadata.title || "Untitled Listing");
  const description = String(raw.description || metadata.description || "");
  const markdown = typeof raw.markdown === "string" ? raw.markdown : "";
  const url = String(raw.url || metadata.sourceURL || metadata.url || "");
  const text = `${title} ${description} ${markdown}`;
  const city = detectCity(text, targets);

  const petPolicy = /\bpet[-\s]?friendly\b|\bdogs?\b|\bcats?\b/i.test(text)
    ? "Pet-friendly"
    : undefined;
  const parking = /\bparking\b|\bgarage\b|\bcarport\b/i.test(text)
    ? "Parking mentioned"
    : undefined;
  const laundry = /\bin[-\s]?unit\b|\bwasher\/dryer\b/i.test(text)
    ? "In-unit laundry"
    : /\bshared laundry\b|\bon-site laundry\b/i.test(text)
      ? "Shared/on-site laundry"
      : undefined;

  const availabilitySummary = [];
  if (/\bavailable now\b/i.test(text)) availabilitySummary.push("Available now");

  const listing: InternalListing = {
    id: `search-${Math.random().toString(36).slice(2, 10)}`,
    title,
    url,
    sourceSite: extractSourceSite(url),
    rent: parseRent(text),
    bedrooms: parseBedrooms(text),
    bathrooms: parseBathrooms(text),
    sqft: parseSqft(text),
    address: typeof metadata.address === "string" ? String(metadata.address) : undefined,
    city,
    imageUrl: typeof metadata.ogImage === "string" ? String(metadata.ogImage) : undefined,
    highlights: [],
    warnings: [],
    score: 0,
    petPolicy,
    parking,
    laundry,
    availabilitySummary,
    floorPlans: [],
    feesBreakdown: [],
    petDetails: [],
    parkingDetails: [],
    leaseTermsDetail: [],
    amenitiesDetail: [],
    qualificationRequirements: [],
    sourceProvenance: ["search"],
    rawText: text,
  };

  listing.highlights = buildHighlights(listing);
  return listing;
}

export function expandTargetCities(cityInput: string, broaden = false): TargetCity[] {
  const lower = cityInput.toLowerCase();
  const matches = new Set<string>();

  for (const key of Object.keys(CITY_CONFIG)) {
    if (lower.includes(key)) matches.add(CITY_CONFIG[key].name);
  }

  if (matches.size === 0) {
    for (const [alias, cities] of Object.entries(REGION_ALIASES)) {
      if (lower.includes(alias)) {
        cities.forEach((city) => matches.add(city));
      }
    }
  }

  if (matches.size === 0) {
    const cleaned = cityInput
      .replace(/\bideally\b/gi, "")
      .replace(/\bnear\b/gi, "")
      .replace(/\barea\b/gi, "")
      .trim();
    return [
      {
        name: cleaned,
        location: cleaned.includes("United States") ? cleaned : `${cleaned},United States`,
        nearby: [],
      },
    ];
  }

  if (broaden) {
    for (const name of Array.from(matches)) {
      const config = Object.values(CITY_CONFIG).find((city) => city.name === name);
      config?.nearby.forEach((city) => matches.add(city));
    }
  }

  return Array.from(matches)
    .map((name) => {
      const config = Object.values(CITY_CONFIG).find((city) => city.name === name);
      return config ?? { name, location: `${name},United States`, nearby: [] };
    })
    .slice(0, broaden ? 6 : 4);
}

export function buildSearchQueries(target: TargetCity, criteria: SearchCriteria): string[] {
  const bedroomPhrase = criteria.bedrooms === 0 ? "studio apartment" : `${criteria.bedrooms} bedroom apartment`;
  const preferenceQuery = [criteria.petFriendly ? "pet friendly" : "", criteria.keywords || ""]
    .filter(Boolean)
    .join(" ")
    .replace(/[,:]/g, " ");

  return [
    `${target.name} ${bedroomPhrase} site:apartments.com`,
    `${target.name} ${bedroomPhrase} rentals site:zillow.com`,
    `${target.name} apartment community ${preferenceQuery}`.trim(),
  ];
}

export function buildExtractPrompt(targets: TargetCity[], criteria: SearchCriteria) {
  return [
    `Find current apartment rentals in ${targets.map((target) => target.name).join(", ")}.`,
    `Return up to 8 strong matches for a ${criteria.bedrooms === 0 ? "studio" : `${criteria.bedrooms}-bedroom`} renter.`,
    `Budget is up to $${criteria.maxRent} per month.`,
    criteria.petFriendly ? "Must be pet-friendly." : "",
    criteria.keywords ? `Required preferences: ${criteria.keywords}.` : "",
    "Reject sold homes, homes for sale, wrong-bedroom listings, and non-rental pages.",
    "Prefer exact city matches, in-unit laundry, parking, and quieter locations when available.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAgentPrompt(targets: TargetCity[], criteria: SearchCriteria) {
  return [
    `Research current apartment listings or apartment communities in ${targets.map((target) => target.name).join(", ")}.`,
    `Find the best ${criteria.bedrooms === 0 ? "studio" : `${criteria.bedrooms}-bedroom`} matches under $${criteria.maxRent} per month.`,
    criteria.petFriendly ? "Pet-friendly is required." : "",
    criteria.keywords ? `Other requirements: ${criteria.keywords}.` : "",
    "Return only rental options with URLs and structured details.",
    "Do not include sold properties, for-sale homes, wrong-bedroom inventory, or listings outside the target cities unless the search has already been broadened.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function normalizeSearchListings(
  rawResults: Array<Record<string, unknown>>,
  criteria: SearchCriteria,
  targets: TargetCity[]
) {
  return rawResults.map((item) => normalizeSearchResult(item, criteria, targets));
}

export function normalizeStructuredListings(
  rawListings: Array<Record<string, unknown>>,
  source: "extract" | "agent",
  criteria: SearchCriteria,
  targets: TargetCity[]
) {
  return rawListings.map((item) => normalizeStructuredListing(item, source, criteria, targets));
}

export function extractStructuredListings(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const response = payload as Record<string, unknown>;
  const data = response.data;

  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).listings;
    if (Array.isArray(nested)) {
      return nested.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }

  return [];
}

export function fuseAndRankListings(
  searchListings: InternalListing[],
  extractListings: InternalListing[],
  agentListings: InternalListing[],
  criteria: SearchCriteria,
  targets: TargetCity[]
) {
  const merged = new Map<string, InternalListing>();

  for (const listing of [...searchListings, ...extractListings, ...agentListings]) {
    const key = canonicalListingKey(listing);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, listing);
      continue;
    }

    const mergedListing: InternalListing = {
      ...existing,
      title: pickBetterString(existing.title, listing.title) || existing.title,
      url: pickBetterString(existing.url, listing.url) || existing.url,
      sourceSite:
        SOURCE_PRIORITY[listing.sourceProvenance?.[0] || "search"] >=
        SOURCE_PRIORITY[existing.sourceProvenance?.[0] || "search"]
          ? listing.sourceSite
          : existing.sourceSite,
      rent: pickBetterNumber(existing.rent, listing.rent),
      bedrooms: pickBetterNumber(existing.bedrooms, listing.bedrooms),
      bathrooms: pickBetterNumber(existing.bathrooms, listing.bathrooms),
      sqft: pickBetterNumber(existing.sqft, listing.sqft),
      address: pickBetterString(existing.address, listing.address),
      city: pickBetterString(existing.city, listing.city),
      imageUrl: pickBetterString(existing.imageUrl, listing.imageUrl),
      petPolicy: pickBetterString(existing.petPolicy, listing.petPolicy),
      parking: pickBetterString(existing.parking, listing.parking),
      laundry: pickBetterString(existing.laundry, listing.laundry),
      moveInDate: pickBetterString(existing.moveInDate, listing.moveInDate),
      highlights: mergeArrays(existing.highlights, listing.highlights),
      warnings: mergeArrays(existing.warnings, listing.warnings),
      verificationSummary: mergeArrays(existing.verificationSummary, listing.verificationSummary),
      quietNotes: mergeArrays(existing.quietNotes, listing.quietNotes),
      availabilitySummary: mergeArrays(existing.availabilitySummary, listing.availabilitySummary),
      floorPlans: mergeArrays(existing.floorPlans, listing.floorPlans),
      feesBreakdown: mergeArrays(existing.feesBreakdown, listing.feesBreakdown),
      petDetails: mergeArrays(existing.petDetails, listing.petDetails),
      parkingDetails: mergeArrays(existing.parkingDetails, listing.parkingDetails),
      leaseTermsDetail: mergeArrays(existing.leaseTermsDetail, listing.leaseTermsDetail),
      amenitiesDetail: mergeArrays(existing.amenitiesDetail, listing.amenitiesDetail),
      qualificationRequirements: mergeArrays(
        existing.qualificationRequirements,
        listing.qualificationRequirements
      ),
      sourceProvenance: mergeArrays(existing.sourceProvenance, listing.sourceProvenance),
      rawText: `${existing.rawText || ""}\n${listing.rawText || ""}`.trim(),
    };

    merged.set(key, mergedListing);
  }

  const listings = Array.from(merged.values())
    .filter((listing) => !hardRejectReason(listing, criteria, targets))
    .map((listing, index) => ({
      ...listing,
      id: listing.id || `listing-${index + 1}`,
      highlights: buildHighlights(listing),
      score: scoreListing(listing, criteria, targets),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  return listings;
}
