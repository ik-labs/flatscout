import { Hono } from "hono";
import { firecrawl } from "../lib/firecrawl";

const app = new Hono();

app.post("/api/interact-page", async (c) => {
  const { session_id, url, action } = await c.req.json();

  if (!url || !action) {
    return c.json({ error: "Missing required fields: url, action" }, 400);
  }

  try {
    // Step 1: Scrape to get session
    const result = await firecrawl.scrape(url, { formats: ["markdown"] });
    const scrapeId = (result as any).metadata?.scrapeId;

    if (!scrapeId) {
      return c.json({
        error: "Could not establish page session. The listing may not support interaction.",
      });
    }

    // Step 2: Interact with the page
    // Note: firecrawl.interact may not be available in all SDK versions.
    // If not available, this will throw and be caught below.
    const interaction = await (firecrawl as any).interact(scrapeId, {
      prompt: action,
    });

    // Step 3: Clean up session
    await (firecrawl as any).stopInteraction(scrapeId);

    return c.json({
      result: interaction.output,
      live_view_url: interaction.liveViewUrl,
    });
  } catch (e: any) {
    return c.json({
      error: `Page interaction failed: ${e.message}. The listing may block automated access.`,
    });
  }
});

export default app;
