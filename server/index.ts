import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import searchListings from "./routes/search-listings";
import scrapeListing from "./routes/scrape-listing";
import deepDive from "./routes/deep-dive";
import verifyNeighborhood from "./routes/verify-neighborhood";
import interactPage from "./routes/interact-page";
import getSignedUrl from "./routes/get-signed-url";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.route("/", getSignedUrl);
app.route("/", searchListings);
app.route("/", scrapeListing);
app.route("/", deepDive);
app.route("/", verifyNeighborhood);
app.route("/", interactPage);

// In production, serve the Vite React build as static files
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.resolve(import.meta.dirname, "../client/dist");
  app.use("/*", serveStatic({ root: clientDistPath }));
  // SPA fallback: serve index.html for non-API, non-static routes
  app.get("*", async (c) => {
    const fs = await import("node:fs/promises");
    const indexPath = path.join(clientDistPath, "index.html");
    const html = await fs.readFile(indexPath, "utf-8");
    return c.html(html);
  });
}

const port = parseInt(process.env.PORT || "3000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Hono server running at http://localhost:${info.port}`);
});

export default app;
