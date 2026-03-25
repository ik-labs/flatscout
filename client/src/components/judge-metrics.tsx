import type { DashboardEvent, Listing, Warning } from "@/lib/types";

interface JudgeMetricsProps {
  events: DashboardEvent[];
  listings: Listing[];
  warnings: Warning[];
}

function parseFoundCount(events: DashboardEvent[]) {
  for (const event of events) {
    const text = `${event.title} ${event.detail}`;
    const match = text.match(/\bFound\s+(\d+)\s+listings?\b/i);
    if (match) return Number(match[1]);
  }
  return listingsFallback(events);
}

function listingsFallback(events: DashboardEvent[]) {
  return events.filter((event) => event.phase === "scrape" && event.status === "succeeded").length;
}

function getMetrics(events: DashboardEvent[], listings: Listing[], warnings: Warning[]) {
  const sites = new Set<string>();
  const verified = new Set<string>();
  const liveChecks = new Set<string>();

  for (const listing of listings) {
    if (listing.sourceSite) sites.add(listing.sourceSite);
    if (listing.stage === "verified") verified.add(listing.id);
    if (listing.liveCheckSummary) liveChecks.add(listing.id);
  }

  for (const event of events) {
    if (event.sourceSite) sites.add(event.sourceSite);
    if (event.phase === "verify" && event.status === "succeeded" && event.listingId) {
      verified.add(event.listingId);
    }
    if (event.phase === "interact" && event.status === "succeeded" && event.listingId) {
      liveChecks.add(event.listingId);
    }
  }

  return [
    { label: "Sites", value: sites.size },
    { label: "Found", value: Math.max(parseFoundCount(events), listings.length) },
    { label: "Qualified", value: listings.length },
    { label: "Verified", value: verified.size },
    { label: "Warnings", value: warnings.length },
    { label: "Live Checks", value: liveChecks.size },
  ];
}

export function JudgeMetrics({ events, listings, warnings }: JudgeMetricsProps) {
  const metrics = getMetrics(events, listings, warnings);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-[112px] rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
          >
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {metric.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
