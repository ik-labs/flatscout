export interface Listing {
  id: string;
  title: string;
  rent: number;
  bedrooms: number;
  sqft?: number;
  imageUrl?: string;
  sourceUrl: string;
  sourceSite: string;
  highlights?: string[];
  warnings?: string[];
  score: number;
  address?: string;
  bathrooms?: number;
  petPolicy?: string;
  parking?: string;
  laundry?: string;
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
  status: "idle" | "searching" | "filtering" | "scraping" | "verifying" | "complete" | "error";
  message: string;
}

export interface TranscriptMessage {
  role: "agent" | "user";
  text: string;
  timestamp: Date;
}
