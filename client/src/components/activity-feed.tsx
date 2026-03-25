import type { DashboardEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  events: DashboardEvent[];
}

const phaseConfig: Record<DashboardEvent["phase"], { label: string; dot: string; icon: string }> = {
  search: { label: "Search", dot: "bg-amber-400", icon: "⌕" },
  scrape: { label: "Details", dot: "bg-sky-400", icon: "↳" },
  verify: { label: "Verify", dot: "bg-purple-400", icon: "✓" },
  deep_dive: { label: "Deep Dive", dot: "bg-orange-400", icon: "⋯" },
  interact: { label: "Live Check", dot: "bg-cyan-400", icon: "◎" },
  rank: { label: "Ranking", dot: "bg-emerald-400", icon: "★" },
};

const statusConfig: Record<DashboardEvent["status"], { label: string; className: string }> = {
  started: { label: "In progress", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  succeeded: { label: "Done", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  failed: { label: "Issue", className: "border-red-500/30 bg-red-500/10 text-red-300" },
};

function formatRelativeTime(timestamp: Date) {
  const delta = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const minutes = Math.floor(delta / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Investigation Feed</h3>
          <p className="text-xs text-zinc-400">
            Live proof of what FlatScout is checking right now
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.22em] text-zinc-300">
          Judge View
        </Badge>
      </div>
      <div className="max-h-[320px] overflow-y-auto px-3 py-3 sm:px-4">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg text-zinc-200">
              ⌕
            </div>
            <div className="text-sm font-medium text-zinc-100">No activity yet</div>
            <p className="mt-2 text-sm text-zinc-400">
              Start a conversation to watch the search unfold live.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const phase = phaseConfig[event.phase];
              const status = statusConfig[event.status];
              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{phase.icon}</span>
                        <div className={cn("h-2 w-2 rounded-full", phase.dot)} />
                        <span className="truncate text-sm font-medium text-zinc-100">{event.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{event.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {formatRelativeTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] text-zinc-300">
                      {phase.label}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] font-mono text-zinc-400">
                      {event.toolName}
                    </Badge>
                    {event.sourceSite && (
                      <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] text-zinc-300">
                        {event.sourceSite}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
