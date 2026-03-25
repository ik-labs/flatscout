import type { Listing, Warning } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  warnings: Warning[];
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

function getStageBadge(stage?: Listing["stage"]) {
  switch (stage) {
    case "verified":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    case "ranked":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "details_pulled":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

function getStageLabel(stage?: Listing["stage"]) {
  switch (stage) {
    case "verified":
      return "Verified";
    case "ranked":
      return "Ranked";
    case "details_pulled":
      return "Details Pulled";
    default:
      return "Discovered";
  }
}

export function ListingCard({ listing, warnings }: ListingCardProps) {
  const evidence = [
    ...(listing.highlights ?? []),
    ...(listing.liveCheckSummary ? [listing.liveCheckSummary] : []),
  ].filter(Boolean);

  return (
    <Card className="overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      <CardHeader className="p-0">
        {listing.imageUrl ? (
          <div className="relative h-40 w-full overflow-hidden bg-muted">
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute right-2 top-2">
              <Badge variant="secondary" className={cn("font-mono text-xs", getScoreColor(listing.score))}>
                {listing.score}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="relative flex h-28 items-center justify-center bg-muted">
            <span className="text-3xl text-muted-foreground">🏠</span>
            <div className="absolute right-2 top-2">
              <Badge variant="secondary" className={cn("font-mono text-xs", getScoreColor(listing.score))}>
                {listing.score}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] uppercase tracking-[0.18em]", getStageBadge(listing.stage))}>
                {getStageLabel(listing.stage)}
              </Badge>
              {listing.lastUpdatedAt && (
                <span className="text-[10px] text-muted-foreground">Updated just now</span>
              )}
            </div>
            <h3 className="text-sm font-semibold leading-tight line-clamp-2">{listing.title}</h3>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">${listing.rent?.toLocaleString()}/mo</span>
          <span>{listing.bedrooms} BR</span>
          {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
          {listing.bathrooms && <span>{listing.bathrooms} BA</span>}
        </div>

        {evidence.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {evidence.slice(0, 4).map((h, i) => (
              <Badge key={i} variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-300">
                {h}
              </Badge>
            ))}
          </div>
        )}

        {listing.verificationSummary && listing.verificationSummary.length > 0 && (
          <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
              Verified Signals
            </div>
            <div className="space-y-1">
              {listing.verificationSummary.slice(0, 3).map((item, i) => (
                <div key={i} className="text-[11px] text-emerald-100/90">
                  + {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {listing.deepDiveNotes && listing.deepDiveNotes.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-300">
              Deep Dive Findings
            </div>
            <div className="space-y-1">
              {listing.deepDiveNotes.slice(0, 2).map((item, i) => (
                <div key={i} className="text-[11px] text-amber-100/90">
                  • {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-3 space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-400">
                ⚠ {w.message}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] text-muted-foreground">{listing.sourceSite}</span>
          <a
            href={listing.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-indigo-400 hover:underline"
          >
            View listing →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
