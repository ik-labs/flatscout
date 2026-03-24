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
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Top Picks Comparison</h3>
      </div>
      <div className="overflow-x-auto">
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
