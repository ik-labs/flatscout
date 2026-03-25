import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createHash, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE_NAME = "flatscout_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

interface AppAuthConfig {
  enabled: boolean;
  username?: string;
  password?: string;
  sessionSecret: string;
}

export interface AuthSessionState {
  enabled: boolean;
  authenticated: boolean;
  username?: string;
}

function getAppAuthConfig(): AppAuthConfig {
  const username = process.env.APP_LOGIN_USERNAME;
  const password = process.env.APP_LOGIN_PASSWORD;
  const enabled = Boolean(username && password);

  return {
    enabled,
    username,
    password,
    sessionSecret: process.env.APP_SESSION_SECRET || password || "",
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(username: string, sessionSecret: string): string {
  return createHash("sha256")
    .update(`${username}:${sessionSecret}:flatscout`)
    .digest("hex");
}

function getExpectedSessionToken(): string | null {
  const config = getAppAuthConfig();

  if (!config.enabled || !config.username || !config.sessionSecret) {
    return null;
  }

  return createSessionToken(config.username, config.sessionSecret);
}

export function isAppAuthEnabled(): boolean {
  return getAppAuthConfig().enabled;
}

export function validateAppCredentials(
  username: string,
  password: string
): boolean {
  const config = getAppAuthConfig();

  if (!config.enabled || !config.username || !config.password) {
    return false;
  }

  return (
    safeEqual(username, config.username) && safeEqual(password, config.password)
  );
}

export function hasValidAppSession(c: Context): boolean {
  const expectedToken = getExpectedSessionToken();

  if (!expectedToken) {
    return true;
  }

  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);

  if (!cookieToken) {
    return false;
  }

  return safeEqual(cookieToken, expectedToken);
}

export function getAuthSessionState(c: Context): AuthSessionState {
  const config = getAppAuthConfig();

  return {
    enabled: config.enabled,
    authenticated: config.enabled ? hasValidAppSession(c) : true,
    username: config.username,
  };
}

export function setAppSessionCookie(c: Context): void {
  const config = getAppAuthConfig();

  if (!config.username || !config.sessionSecret) {
    return;
  }

  setCookie(c, SESSION_COOKIE_NAME, createSessionToken(config.username, config.sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export function clearAppSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
  });
}

export const requireAppAuth: MiddlewareHandler = async (c, next) => {
  if (!isAppAuthEnabled()) {
    await next();
    return;
  }

  if (!hasValidAppSession(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};

export const requireToolSecret: MiddlewareHandler = async (c, next) => {
  const configuredSecret = process.env.TOOL_API_SECRET;

  if (!configuredSecret) {
    await next();
    return;
  }

  const providedSecret = c.req.header("x-flatscout-tool-secret") || "";

  if (!safeEqual(providedSecret, configuredSecret)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};
