import type { VerificationReport, VerificationSection } from "./types";

/**
 * Synthesize raw Firecrawl search results into a structured verification report.
 * Each check type (reviews, safety, noise, flooding) maps to a section.
 */
export function synthesizeVerification(
  results: (any[] | null)[],
  checks: string[]
): { report: VerificationReport } {
  const sections: Record<string, VerificationSection> = {};
  let riskScore = 0;

  checks.forEach((check, index) => {
    const data = results[index];
    if (!data || data.length === 0) {
      sections[check] = {
        available: false,
        snippets: [],
        sources: [],
      };
      return;
    }

    const snippets: string[] = [];
    const sources: string[] = [];

    for (const item of data) {
      if (item?.description || item?.markdown) {
        const text = item.description || item.markdown?.slice(0, 500);
        snippets.push(text);
      }
      if (item?.url) {
        sources.push(item.url);
      }
    }

    const sentiment = analyzeSentiment(snippets, check);
    if (sentiment === "negative") riskScore += 2;
    if (sentiment === "mixed") riskScore += 1;

    sections[check] = {
      available: true,
      sentiment,
      snippets: snippets.slice(0, 3),
      sources: sources.slice(0, 3),
    };
  });

  const overallRisk: "low" | "medium" | "high" =
    riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

  const report: VerificationReport = {
    address: "",
    reviews: sections["reviews"] || { available: false, snippets: [], sources: [] },
    safety: sections["safety"] || { available: false, snippets: [], sources: [] },
    noise: sections["noise"] || { available: false, snippets: [], sources: [] },
    flooding: sections["flooding"],
    overallRisk,
    summary: generateSummary(sections, overallRisk),
  };

  return { report };
}

function analyzeSentiment(
  snippets: string[],
  _checkType: string
): "positive" | "mixed" | "negative" {
  const text = snippets.join(" ").toLowerCase();

  const negativeWords = [
    "terrible", "awful", "worst", "avoid", "scam", "unsafe",
    "dangerous", "noisy", "loud", "cockroach", "roach", "bed bug",
    "mold", "broken", "never fixed", "management doesn't care",
    "crime", "shooting", "robbery", "theft", "flood",
  ];
  const positiveWords = [
    "great", "excellent", "love", "amazing", "clean", "quiet",
    "safe", "friendly", "responsive", "well maintained", "recommend",
  ];

  const negCount = negativeWords.filter((w) => text.includes(w)).length;
  const posCount = positiveWords.filter((w) => text.includes(w)).length;

  if (negCount >= 3) return "negative";
  if (posCount >= 3 && negCount === 0) return "positive";
  if (negCount > posCount) return "negative";
  if (posCount > negCount) return "positive";
  return "mixed";
}

function generateSummary(
  sections: Record<string, VerificationSection>,
  risk: "low" | "medium" | "high"
): string {
  const parts: string[] = [];

  if (sections["reviews"]?.available) {
    parts.push(
      `Reviews are ${sections["reviews"].sentiment || "mixed"}.`
    );
  }
  if (sections["safety"]?.available) {
    parts.push(
      `Safety assessment: ${sections["safety"].sentiment || "mixed"}.`
    );
  }
  if (sections["noise"]?.available) {
    parts.push(
      `Noise level: ${sections["noise"].sentiment === "negative" ? "concerning" : sections["noise"].sentiment === "positive" ? "quiet area" : "some reports"}.`
    );
  }

  parts.push(`Overall risk: ${risk}.`);
  return parts.join(" ");
}
