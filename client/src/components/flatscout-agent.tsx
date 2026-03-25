import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
import type { DashboardEvent, Listing, SearchStatus, TranscriptMessage, Warning } from "@/lib/types";
import { VoicePanel } from "@/components/voice-panel";
import { ResearchDashboard } from "@/components/research-dashboard";
import { API_URL } from "@/lib/api";

const MAX_EVENTS = 30;

function parseStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall through to text splitting
    }
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function mapSearchStatusToPhase(status: SearchStatus["status"]): DashboardEvent["phase"] {
  switch (status) {
    case "searching":
    case "filtering":
      return "search";
    case "scraping":
      return "scrape";
    case "verifying":
      return "verify";
    case "complete":
      return "rank";
    case "error":
      return "search";
    default:
      return "search";
  }
}

export function FlatScoutAgent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [rankedListings, setRankedListings] = useState<Listing[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    status: "idle",
    message: "",
  });
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const pushEvent = useCallback((event: DashboardEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const conversation = useConversation({
    micMuted: isMicMuted,
    onConnect: () => {
      setIsSessionActive(true);
    },
    onDisconnect: () => {
      setIsSessionActive(false);
      setIsMicMuted(false);
    },
    onMessage: (message) => {
      if (message.source === "ai" && typeof message.message === "string") {
        setTranscript((prev) => [
          ...prev,
          { role: "agent", text: message.message as string, timestamp: new Date() },
        ]);
      } else if (message.source === "user" && typeof message.message === "string") {
        setTranscript((prev) => [
          ...prev,
          { role: "user", text: message.message as string, timestamp: new Date() },
        ]);
      }
    },
    onError: (error) => {
      console.error("[FlatScout] Conversation error:", error);
      setSearchStatus({ status: "error", message: "Connection error occurred" });
      pushEvent({
        id: `connection-error-${Date.now()}`,
        phase: "search",
        status: "failed",
        title: "Connection issue",
        detail: "The conversation hit an unexpected connection error.",
        toolName: "conversation",
        timestamp: new Date(),
      });
    },
    clientTools: {
      add_listing_card: async (params: Record<string, unknown>) => {
        const listingId = params.listing_id as string;
        const title = params.title as string;
        const sourceSite = params.source_site as string;

        setListings((prev) => {
          const nextListing: Listing = {
            id: listingId,
            title,
            rent: params.rent as number,
            bedrooms: params.bedrooms as number,
            sqft: params.sqft as number | undefined,
            imageUrl: params.image_url as string | undefined,
            sourceUrl: params.source_url as string,
            sourceSite,
            highlights: typeof params.highlights === "string"
              ? (params.highlights as string).split(",").map((s: string) => s.trim())
              : undefined,
            warnings: typeof params.warnings === "string"
              ? (params.warnings as string).split(",").map((s: string) => s.trim())
              : undefined,
            score: params.score as number,
            stage: "details_pulled",
            lastUpdatedAt: new Date().toISOString(),
            feesSummary: parseStringList(params.fees_summary),
            petPolicySummary: parseStringList(params.pet_policy_summary),
            parkingSummary: parseStringList(params.parking_summary),
            leaseTermsSummary: parseStringList(params.lease_terms_summary),
            availabilitySummary: parseStringList(params.availability_summary),
            floorPlanSummary: parseStringList(params.floor_plan_summary),
            amenitiesSummary: parseStringList(params.amenities_summary),
            qualificationSummary: parseStringList(params.qualification_summary),
            sourceProvenance: parseStringList(params.source_provenance),
          };

          const existingIndex = prev.findIndex((listing) => listing.id === listingId);
          if (existingIndex === -1) return [...prev, nextListing];

          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...nextListing };
          return next;
        });
        pushEvent({
          id: `listing-${listingId}-${Date.now()}`,
          phase: "scrape",
          status: "succeeded",
          title: `Qualified ${title}`,
          detail: `Added a viable ${sourceSite} listing to the dashboard.`,
          toolName: "add_listing_card",
          listingId,
          sourceSite,
          timestamp: new Date(),
        });
        return "Listing card added to dashboard";
      },

      update_comparison_table: async (params: Record<string, unknown>) => {
        try {
          const parsed = JSON.parse(params.listings_json as string);
          setRankedListings(parsed);
          setListings((prev) =>
            prev.map((listing) =>
              parsed.some((ranked: Listing) => ranked.id === listing.id)
                ? { ...listing, stage: "ranked", lastUpdatedAt: new Date().toISOString() }
                : listing
            )
          );
          pushEvent({
            id: `rank-${Date.now()}`,
            phase: "rank",
            status: "succeeded",
            title: "Top picks ranked",
            detail: `FlatScout assembled a ranked shortlist of ${parsed.length} listings.`,
            toolName: "update_comparison_table",
            timestamp: new Date(),
          });
        } catch {
          console.error("[FlatScout] Failed to parse comparison table data");
        }
        return "Comparison table updated";
      },

      show_warning: async (params: Record<string, unknown>) => {
        const listingId = params.listing_id as string;
        const warningType = params.warning_type as Warning["type"];
        const message = params.message as string;
        setWarnings((prev) => [
          ...prev,
          {
            listingId,
            type: warningType,
            message,
          },
        ]);
        setListings((prev) =>
          prev.map((listing) =>
            listing.id === listingId
              ? { ...listing, lastUpdatedAt: new Date().toISOString() }
              : listing
          )
        );
        pushEvent({
          id: `warning-${listingId}-${Date.now()}`,
          phase: "verify",
          status: "failed",
          title: "Flagged a risk",
          detail: message,
          toolName: "show_warning",
          listingId,
          timestamp: new Date(),
        });
        return "Warning displayed";
      },

      set_search_status: async (params: Record<string, unknown>) => {
        const status = params.status as SearchStatus["status"];
        const message = params.message as string;
        setSearchStatus({
          status,
          message,
        });
        if (status !== "idle") {
          pushEvent({
            id: `status-${status}-${Date.now()}`,
            phase: mapSearchStatusToPhase(status),
            status: status === "error" ? "failed" : status === "complete" ? "succeeded" : "started",
            title:
              status === "complete"
                ? "Shortlist ready"
                : status === "error"
                  ? "Search issue"
                  : message || `Now ${status}`,
            detail: message || `FlatScout is ${status}.`,
            toolName: "set_search_status",
            timestamp: new Date(),
          });
        }
        return "Status updated";
      },

      log_activity_event: async (params: Record<string, unknown>) => {
        pushEvent({
          id: (params.event_id as string) || `event-${Date.now()}`,
          phase: (params.phase as DashboardEvent["phase"]) || "search",
          status: (params.status as DashboardEvent["status"]) || "started",
          title: (params.title as string) || "Activity update",
          detail: (params.detail as string) || "",
          toolName: (params.tool_name as string) || "log_activity_event",
          listingId: params.listing_id as string | undefined,
          sourceSite: params.source_site as string | undefined,
          timestamp: new Date(),
        });
        return "Activity event logged";
      },

      update_listing_card: async (params: Record<string, unknown>) => {
        const listingId = params.listing_id as string;
        const stage = params.stage as Listing["stage"];
        const verificationSummary = parseStringList(params.verification_summary);
        const deepDiveNotes = parseStringList(params.deep_dive_notes);
        const liveCheckSummary = typeof params.live_check_summary === "string"
          ? params.live_check_summary
          : undefined;
        const highlights = parseStringList(params.highlights);
        const feesSummary = parseStringList(params.fees_summary);
        const petPolicySummary = parseStringList(params.pet_policy_summary);
        const parkingSummary = parseStringList(params.parking_summary);
        const leaseTermsSummary = parseStringList(params.lease_terms_summary);
        const availabilitySummary = parseStringList(params.availability_summary);
        const floorPlanSummary = parseStringList(params.floor_plan_summary);
        const amenitiesSummary = parseStringList(params.amenities_summary);
        const qualificationSummary = parseStringList(params.qualification_summary);
        const sourceProvenance = parseStringList(params.source_provenance);

        setListings((prev) =>
          prev.map((listing) =>
            listing.id === listingId
              ? {
                  ...listing,
                  stage: stage || listing.stage,
                  verificationSummary:
                    verificationSummary.length > 0 ? verificationSummary : listing.verificationSummary,
                  deepDiveNotes: deepDiveNotes.length > 0 ? deepDiveNotes : listing.deepDiveNotes,
                  liveCheckSummary: liveCheckSummary || listing.liveCheckSummary,
                  highlights: highlights.length > 0 ? highlights : listing.highlights,
                  feesSummary: feesSummary.length > 0 ? feesSummary : listing.feesSummary,
                  petPolicySummary:
                    petPolicySummary.length > 0 ? petPolicySummary : listing.petPolicySummary,
                  parkingSummary:
                    parkingSummary.length > 0 ? parkingSummary : listing.parkingSummary,
                  leaseTermsSummary:
                    leaseTermsSummary.length > 0
                      ? leaseTermsSummary
                      : listing.leaseTermsSummary,
                  availabilitySummary:
                    availabilitySummary.length > 0
                      ? availabilitySummary
                      : listing.availabilitySummary,
                  floorPlanSummary:
                    floorPlanSummary.length > 0 ? floorPlanSummary : listing.floorPlanSummary,
                  amenitiesSummary:
                    amenitiesSummary.length > 0 ? amenitiesSummary : listing.amenitiesSummary,
                  qualificationSummary:
                    qualificationSummary.length > 0
                      ? qualificationSummary
                      : listing.qualificationSummary,
                  sourceProvenance:
                    sourceProvenance.length > 0
                      ? sourceProvenance
                      : listing.sourceProvenance,
                  lastUpdatedAt: new Date().toISOString(),
                }
              : listing
          )
        );

        pushEvent({
          id: `listing-update-${listingId}-${Date.now()}`,
          phase:
            stage === "verified"
              ? "verify"
              : deepDiveNotes.length > 0
                ? "deep_dive"
                : liveCheckSummary
                  ? "interact"
                  : "scrape",
          status: "succeeded",
          title: "Updated listing evidence",
          detail:
            verificationSummary[0] ||
            deepDiveNotes[0] ||
            liveCheckSummary ||
            "Refreshed listing details for the dashboard.",
          toolName: "update_listing_card",
          listingId,
          timestamp: new Date(),
        });
        return "Listing card updated";
      },
    },
  });

  const startSession = useCallback(async () => {
    try {
      setListings([]);
      setRankedListings([]);
      setWarnings([]);
      setEvents([]);
      setTranscript([]);
      setSearchStatus({ status: "idle", message: "" });
      setIsMicMuted(false);

      const res = await fetch(`${API_URL}/api/get-signed-url`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.error) {
        setSearchStatus({ status: "error", message: data.error });
        return;
      }

      await conversation.startSession({
        signedUrl: data.signedUrl,
      });
    } catch (err) {
      console.error("[FlatScout] Failed to start session:", err);
      setSearchStatus({ status: "error", message: "Failed to connect to agent" });
    }
  }, [conversation]);

  const endSession = useCallback(async () => {
    await conversation.endSession();
    setIsSessionActive(false);
    setIsMicMuted(false);
  }, [conversation]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:h-screen lg:flex-row">
      {/* Voice Panel — Left 40% */}
      <div className="flex min-h-[52svh] w-full flex-col border-b border-border lg:min-h-0 lg:w-2/5 lg:min-w-[320px] lg:border-b-0 lg:border-r">
        <VoicePanel
          isSessionActive={isSessionActive}
          isMicMuted={conversation.micMuted ?? isMicMuted}
          isSpeaking={conversation.isSpeaking}
          status={conversation.status}
          transcript={transcript}
          searchStatus={searchStatus}
          onStartSession={startSession}
          onEndSession={endSession}
          onToggleMute={() => setIsMicMuted((current) => !current)}
        />
      </div>

      {/* Research Dashboard — Right 60% */}
      <div className="flex min-h-[48svh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
        <ResearchDashboard
          events={events}
          listings={listings}
          rankedListings={rankedListings}
          warnings={warnings}
          searchStatus={searchStatus}
        />
      </div>
    </div>
  );
}
