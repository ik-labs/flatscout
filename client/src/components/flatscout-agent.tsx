import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
import type { Listing, Warning, SearchStatus, TranscriptMessage } from "@/lib/types";
import { VoicePanel } from "@/components/voice-panel";
import { ResearchDashboard } from "@/components/research-dashboard";

const API_URL = import.meta.env.VITE_API_URL || "";

export function FlatScoutAgent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [rankedListings, setRankedListings] = useState<Listing[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    status: "idle",
    message: "",
  });
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      setIsSessionActive(true);
    },
    onDisconnect: () => {
      setIsSessionActive(false);
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
    },
    clientTools: {
      add_listing_card: async (params: Record<string, unknown>) => {
        setListings((prev) => [
          ...prev,
          {
            id: params.listing_id as string,
            title: params.title as string,
            rent: params.rent as number,
            bedrooms: params.bedrooms as number,
            sqft: params.sqft as number | undefined,
            imageUrl: params.image_url as string | undefined,
            sourceUrl: params.source_url as string,
            sourceSite: params.source_site as string,
            highlights: typeof params.highlights === "string"
              ? (params.highlights as string).split(",").map((s: string) => s.trim())
              : undefined,
            warnings: typeof params.warnings === "string"
              ? (params.warnings as string).split(",").map((s: string) => s.trim())
              : undefined,
            score: params.score as number,
          },
        ]);
        return "Listing card added to dashboard";
      },

      update_comparison_table: async (params: Record<string, unknown>) => {
        try {
          const parsed = JSON.parse(params.listings_json as string);
          setRankedListings(parsed);
        } catch {
          console.error("[FlatScout] Failed to parse comparison table data");
        }
        return "Comparison table updated";
      },

      show_warning: async (params: Record<string, unknown>) => {
        setWarnings((prev) => [
          ...prev,
          {
            listingId: params.listing_id as string,
            type: params.warning_type as Warning["type"],
            message: params.message as string,
          },
        ]);
        return "Warning displayed";
      },

      set_search_status: async (params: Record<string, unknown>) => {
        setSearchStatus({
          status: params.status as SearchStatus["status"],
          message: params.message as string,
        });
        return "Status updated";
      },
    },
  });

  const startSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/get-signed-url`);
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
  }, [conversation]);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Voice Panel — Left 40% */}
      <div className="w-2/5 min-w-[320px] border-r border-border flex flex-col">
        <VoicePanel
          isSessionActive={isSessionActive}
          isSpeaking={conversation.isSpeaking}
          status={conversation.status}
          transcript={transcript}
          searchStatus={searchStatus}
          onStartSession={startSession}
          onEndSession={endSession}
        />
      </div>

      {/* Research Dashboard — Right 60% */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResearchDashboard
          listings={listings}
          rankedListings={rankedListings}
          warnings={warnings}
          searchStatus={searchStatus}
        />
      </div>
    </div>
  );
}
