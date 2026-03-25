import { Hono } from "hono";
import {
  clearAppSessionCookie,
  getAuthSessionState,
  isAppAuthEnabled,
  setAppSessionCookie,
  validateAppCredentials,
} from "../lib/auth";

const app = new Hono();

app.get("/api/auth/session", (c) => {
  return c.json(getAuthSessionState(c));
});

app.post("/api/auth/login", async (c) => {
  if (!isAppAuthEnabled()) {
    return c.json({ error: "App auth is not configured on the server." }, 503);
  }

  const body = (await c.req.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;

  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!validateAppCredentials(username, password)) {
    return c.json({ error: "Invalid username or password." }, 401);
  }

  setAppSessionCookie(c);

  return c.json(getAuthSessionState(c));
});

app.post("/api/auth/logout", (c) => {
  clearAppSessionCookie(c);
  return c.json({
    enabled: isAppAuthEnabled(),
    authenticated: false,
  });
});

export default app;
