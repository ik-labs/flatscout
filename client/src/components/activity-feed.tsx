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
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Investigation Feed</h3>
          <p className="text-xs text-muted-foreground">
            Live proof of what FlatScout is checking right now
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-[0.22em]">
          Judge View
        </Badge>
      </div>
      <div className="max-h-[320px] overflow-y-auto px-3 py-3 sm:px-4">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
            <div className="text-sm font-medium">No activity yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
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
                  className="rounded-xl border border-border bg-background/60 px-4 py-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{phase.icon}</span>
                        <div className={cn("h-2 w-2 rounded-full", phase.dot)} />
                        <span className="truncate text-sm font-medium">{event.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {formatRelativeTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {phase.label}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                      {event.toolName}
                    </Badge>
                    {event.sourceSite && (
                      <Badge variant="outline" className="text-[10px]">
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
