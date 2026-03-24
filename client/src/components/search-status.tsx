import type { SearchStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SearchStatusBarProps {
  searchStatus: SearchStatus;
}

const statusConfig: Record<SearchStatus["status"], { color: string; label: string }> = {
  idle: { color: "bg-gray-400", label: "Ready" },
  searching: { color: "bg-amber-400", label: "Searching" },
  filtering: { color: "bg-amber-400", label: "Filtering" },
  scraping: { color: "bg-blue-400", label: "Scraping" },
  verifying: { color: "bg-purple-400", label: "Verifying" },
  complete: { color: "bg-emerald-400", label: "Complete" },
  error: { color: "bg-red-400", label: "Error" },
};

export function SearchStatusBar({ searchStatus }: SearchStatusBarProps) {
  const config = statusConfig[searchStatus.status];
  const isActive = !["idle", "complete", "error"].includes(searchStatus.status);

  if (searchStatus.status === "idle") return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className={cn("h-2.5 w-2.5 rounded-full", config.color, isActive && "animate-pulse")} />
      <div className="flex-1">
        <span className="text-sm font-medium">{config.label}</span>
        {searchStatus.message && (
          <span className="ml-2 text-sm text-muted-foreground">{searchStatus.message}</span>
        )}
      </div>
    </div>
  );
}
