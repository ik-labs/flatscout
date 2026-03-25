import type { DashboardEvent, Listing, Warning, SearchStatus } from "@/lib/types";
import { ActivityFeed } from "@/components/activity-feed";
import { JudgeMetrics } from "@/components/judge-metrics";
import { SearchStatusBar } from "@/components/search-status";
import { ListingCard } from "@/components/listing-card";
import { ComparisonTable } from "@/components/comparison-table";
import { WarningBanner } from "@/components/warning-banner";

interface ResearchDashboardProps {
  events: DashboardEvent[];
  listings: Listing[];
  rankedListings: Listing[];
  warnings: Warning[];
  searchStatus: SearchStatus;
}

export function ResearchDashboard({
  events,
  listings,
  rankedListings,
  warnings,
  searchStatus,
}: ResearchDashboardProps) {
  const globalWarnings = warnings.filter((w) => !w.listingId);

  return (
    <div className="flex h-full min-h-full flex-col overflow-y-auto bg-background p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Research Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Watch FlatScout search, verify, and rank listings in real time
        </p>
      </div>

      <div className="mb-4">
        <JudgeMetrics events={events} listings={listings} warnings={warnings} />
      </div>

      {/* Search Status */}
      <div className="mb-4">
        <SearchStatusBar searchStatus={searchStatus} />
      </div>

      <div className="mb-6 lg:sticky lg:top-0 lg:z-10 lg:bg-background lg:pb-4">
        <ActivityFeed events={events} />
      </div>

      {/* Global Warnings */}
      {globalWarnings.length > 0 && (
        <div className="mb-4">
          <WarningBanner warnings={globalWarnings} />
        </div>
      )}

      {/* Comparison Table */}
      {rankedListings.length > 0 && (
        <div className="mb-6">
          <ComparisonTable listings={rankedListings} />
        </div>
      )}

      {/* Listing Cards Grid */}
      {listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              warnings={warnings.filter((w) => w.listingId === listing.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[30svh] flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-3 text-5xl">🔍</div>
            <p className="text-sm text-muted-foreground">
              {searchStatus.status === "idle"
                ? "Start a conversation to open the live investigation feed"
                : "Listing evidence will appear here as FlatScout qualifies the best options."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
