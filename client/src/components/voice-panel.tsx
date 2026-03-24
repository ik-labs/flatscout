import { useRef, useEffect } from "react";
import type { SearchStatus, TranscriptMessage } from "@/lib/types";
import { Orb, type AgentState } from "@/components/ui/orb";
import { cn } from "@/lib/utils";

interface VoicePanelProps {
  isSessionActive: boolean;
  isSpeaking: boolean;
  status: string;
  transcript: TranscriptMessage[];
  searchStatus: SearchStatus;
  onStartSession: () => void;
  onEndSession: () => void;
}

export function VoicePanel({
  isSessionActive,
  isSpeaking,
  status,
  transcript,
  searchStatus,
  onStartSession,
  onEndSession,
}: VoicePanelProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const agentState: AgentState = !isSessionActive
    ? null
    : isSpeaking
      ? "talking"
      : status === "connected"
        ? "listening"
        : "thinking";

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">FlatScout</h1>
          <p className="text-xs text-gray-400">AI Apartment Finder</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isSessionActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
            )}
          />
          <span className="text-xs text-gray-400">
            {isSessionActive ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Orb */}
      <div className="flex items-center justify-center py-8">
        <div className="h-48 w-48">
          <Orb
            agentState={agentState}
            colors={["#6366f1", "#8b5cf6"]}
          />
        </div>
      </div>

      {/* Connect/Disconnect Button */}
      <div className="flex justify-center px-6 pb-4">
        {!isSessionActive ? (
          <button
            onClick={onStartSession}
            className="rounded-full bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            Start Conversation
          </button>
        ) : (
          <button
            onClick={onEndSession}
            className="rounded-full bg-red-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            End Conversation
          </button>
        )}
      </div>

      {/* Search Status */}
      {searchStatus.status !== "idle" && (
        <div className="mx-6 mb-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
          <div className="flex items-center gap-2">
            {searchStatus.status === "complete" ? (
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
            ) : searchStatus.status === "error" ? (
              <div className="h-2 w-2 rounded-full bg-red-400" />
            ) : (
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            )}
            <span className="text-xs text-gray-300">{searchStatus.message}</span>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-3">
          {transcript.length === 0 && (
            <p className="text-center text-sm text-gray-500 pt-4">
              {isSessionActive
                ? "Listening..."
                : "Press \"Start Conversation\" to begin"}
            </p>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.role === "agent"
                  ? "bg-white/5 text-gray-200"
                  : "bg-indigo-600/20 text-indigo-200 ml-4"
              )}
            >
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
                {msg.role === "agent" ? "FlatScout" : "You"}
              </span>
              {msg.text}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}
