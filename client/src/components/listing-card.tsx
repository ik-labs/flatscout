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

export function ListingCard({ listing, warnings }: ListingCardProps) {
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
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{listing.title}</h3>
        </div>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">${listing.rent?.toLocaleString()}/mo</span>
          <span>{listing.bedrooms} BR</span>
          {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
          {listing.bathrooms && <span>{listing.bathrooms} BA</span>}
        </div>

        {listing.highlights && listing.highlights.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {listing.highlights.slice(0, 3).map((h, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {h}
              </Badge>
            ))}
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
