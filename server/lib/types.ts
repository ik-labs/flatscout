export interface Listing {
  id: string;
  title: string;
  url: string;
  sourceSite: string;
  rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  address?: string;
  city?: string;
  imageUrl?: string;
  highlights?: string[];
  warnings?: string[];
  score?: number;
  petPolicy?: string;
  parking?: string;
  laundry?: string;
  moveInDate?: string;
}

export interface Warning {
  listingId: string;
  type:
    | "price_mismatch"
    | "bad_reviews"
    | "noise"
    | "hidden_fees"
    | "availability"
    | "scam_risk";
  message: string;
}

export interface SearchStatus {
  status: "idle" | "searching" | "scraping" | "verifying" | "complete" | "error";
  message: string;
}

export interface Session {
  id: string;
  listings: Listing[];
  scrapedUrls: Record<string, any>;
  verificationReports: Record<string, VerificationReport>;
  createdAt: Date;
}

export interface VerificationReport {
  address: string;
  reviews: VerificationSection;
  safety: VerificationSection;
  noise: VerificationSection;
  flooding?: VerificationSection;
  overallRisk: "low" | "medium" | "high";
  summary: string;
}

export interface VerificationSection {
  available: boolean;
  sentiment?: "positive" | "mixed" | "negative";
  snippets: string[];
  sources: string[];
}
