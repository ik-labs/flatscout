export type ListingStage = "discovered" | "details_pulled" | "verified" | "ranked";

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
  stage?: ListingStage;
  verificationSummary?: string[];
  deepDiveNotes?: string[];
  liveCheckSummary?: string;
  lastUpdatedAt?: string;
  feesSummary?: string[];
  petPolicySummary?: string[];
  parkingSummary?: string[];
  leaseTermsSummary?: string[];
  availabilitySummary?: string[];
  floorPlanSummary?: string[];
  amenitiesSummary?: string[];
  qualificationSummary?: string[];
  sourceProvenance?: string[];
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

export interface DashboardEvent {
  id: string;
  phase: "search" | "scrape" | "verify" | "deep_dive" | "interact" | "rank";
  status: "started" | "succeeded" | "failed";
  title: string;
  detail: string;
  toolName: string;
  listingId?: string;
  sourceSite?: string;
  timestamp: Date;
}

export interface TranscriptMessage {
  role: "agent" | "user";
  text: string;
  timestamp: Date;
}
