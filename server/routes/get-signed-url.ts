import { Hono } from "hono";

const app = new Hono();

app.get("/api/get-signed-url", async (c) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    return c.json(
      { error: "ElevenLabs credentials not configured on server." },
      500
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      return c.json(
        { error: `ElevenLabs API error: ${response.status} ${body}` },
        502
      );
    }

    const data = await response.json();
    return c.json({ signedUrl: data.signed_url });
  } catch (e: any) {
    return c.json({ error: `Failed to get signed URL: ${e.message}` }, 500);
  }
});

export default app;
