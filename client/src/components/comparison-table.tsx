import type { Listing } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ComparisonTableProps {
  listings: Listing[];
}

function getScoreBadge(score: number) {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

export function ComparisonTable({ listings }: ComparisonTableProps) {
  if (listings.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Top Picks Comparison</h3>
          <p className="text-xs text-muted-foreground">FlatScout has ranked the strongest shortlist</p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
          Top 3 Ready
        </Badge>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {listings.map((listing, i) => (
          <div key={listing.id || i} className="rounded-lg border border-border bg-background/60 p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Pick {i + 1}
                </div>
                <a
                  href={listing.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-medium leading-snug hover:underline"
                >
                  {listing.title}
                </a>
                <div className="mt-1 text-[11px] text-muted-foreground">{listing.sourceSite}</div>
              </div>
              <Badge variant="outline" className={cn("shrink-0 font-mono text-xs", getScoreBadge(listing.score))}>
                {listing.score}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-muted/60 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Rent</div>
                <div className="mt-1 font-mono text-foreground">${listing.rent?.toLocaleString()}</div>
              </div>
              <div className="rounded-md bg-muted/60 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Sqft</div>
                <div className="mt-1 font-mono text-foreground">
                  {listing.sqft ? listing.sqft.toLocaleString() : "—"}
                </div>
              </div>
              <div className="rounded-md bg-muted/60 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">BR</div>
                <div className="mt-1 font-mono text-foreground">{listing.bedrooms}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead className="text-right">Sqft</TableHead>
              <TableHead className="text-right">BR</TableHead>
              <TableHead className="text-center">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing, i) => (
              <TableRow key={listing.id || i}>
                <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <a
                    href={listing.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {listing.title}
                  </a>
                  <div className="text-[10px] text-muted-foreground">{listing.sourceSite}</div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${listing.rent?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {listing.sqft ? listing.sqft.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">{listing.bedrooms}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn("font-mono text-xs", getScoreBadge(listing.score))}>
                    {listing.score}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
