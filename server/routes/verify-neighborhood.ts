import { Hono } from "hono";
import { safeFirecrawlSearch } from "../lib/firecrawl";
import { getOrCreateSession } from "../lib/session";
import { synthesizeVerification } from "../lib/verification";

const app = new Hono();

app.post("/api/verify-neighborhood", async (c) => {
  const { session_id, address, building_name, check_types } =
    await c.req.json();

  if (!session_id || !address) {
    return c.json(
      { error: "Missing required fields: session_id, address" },
      400
    );
  }

  const session = getOrCreateSession(session_id);
  const checks = (check_types || "reviews,safety,noise").split(",");
  const name = building_name || address;

  const searchTasks: Promise<any>[] = [];

  if (checks.includes("reviews")) {
    searchTasks.push(
      safeFirecrawlSearch(`"${name}" apartment reviews`, {
        limit: 5,
        tbs: "qdr:y",
      })
    );
  }
  if (checks.includes("safety")) {
    searchTasks.push(
      safeFirecrawlSearch(`${address} crime safety neighborhood`, { limit: 3 })
    );
  }
  if (checks.includes("noise")) {
    searchTasks.push(
      safeFirecrawlSearch(`"${name}" noise complaints`, {
        limit: 3,
        sources: ["web", "news"],
      })
    );
  }
  if (checks.includes("flooding")) {
    searchTasks.push(
      safeFirecrawlSearch(`${address} flood zone risk`, { limit: 2 })
    );
  }

  const results = await Promise.allSettled(searchTasks);
  const successful = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<any>).value);

  if (successful.length === 0) {
    return c.json({
      error: "Could not verify neighborhood — search sources unavailable.",
      report: {},
    });
  }

  const report = synthesizeVerification(successful, checks);
  return c.json(report);
});

export default app;
