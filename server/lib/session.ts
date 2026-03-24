import type { Session } from "./types";

const sessions = new Map<string, Session>();

export function getOrCreateSession(sessionId: string): Session {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const session: Session = {
    id: sessionId,
    listings: [],
    scrapedUrls: {},
    verificationReports: {},
    createdAt: new Date(),
  };

  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
