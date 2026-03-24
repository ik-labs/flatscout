import type { Warning } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WarningBannerProps {
  warnings: Warning[];
}

const warningLabels: Record<Warning["type"], string> = {
  price_mismatch: "Price Mismatch",
  bad_reviews: "Bad Reviews",
  noise: "Noise Concerns",
  hidden_fees: "Hidden Fees",
  availability: "Availability Issue",
  scam_risk: "Potential Scam",
};

export function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
      {warnings.map((warning, i) => (
        <Alert key={i} variant="destructive" className="border-red-500/30 bg-red-500/10">
          <AlertTitle className="text-sm">
            ⚠ {warningLabels[warning.type] || warning.type}
          </AlertTitle>
          <AlertDescription className="text-xs text-red-300">
            {warning.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
