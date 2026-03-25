import FirecrawlApp from "@mendable/firecrawl-js";

let _firecrawl: InstanceType<typeof FirecrawlApp> | null = null;

/**
 * Lazy-initialize Firecrawl client. Throws at call time (not import time)
 * if FIRECRAWL_API_KEY is missing.
 */
export function getFirecrawl(): InstanceType<typeof FirecrawlApp> {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not set in environment variables.");
    }
    _firecrawl = new FirecrawlApp({ apiKey });
  }
  return _firecrawl;
}

/** Convenience alias for routes that use the client directly */
export const firecrawl = new Proxy({} as InstanceType<typeof FirecrawlApp>, {
  get(_target, prop) {
    return (getFirecrawl() as any)[prop];
  },
});

/**
 * Wrapper around firecrawl.search that catches errors and returns null
 * instead of throwing. This allows Promise.allSettled patterns to work
 * cleanly when some search sources fail.
 */
export async function safeFirecrawlSearch(
  query: string,
  options: Record<string, any> = {}
): Promise<any[] | null> {
  try {
    const fc = getFirecrawl();
    const result = await fc.search(query, options);
    return result.web ?? [];
  } catch (error: any) {
    console.error(`[Firecrawl] Search failed for query "${query}":`, error.message);
    return null;
  }
}

export async function safeFirecrawlExtract(
  args: Record<string, any>
): Promise<Record<string, any> | null> {
  try {
    const fc = getFirecrawl();
    const result = await fc.extract(args as any);
    return result as Record<string, any>;
  } catch (error: any) {
    console.error("[Firecrawl] Extract failed:", error.message);
    return null;
  }
}

export async function safeFirecrawlAgent(
  args: Record<string, any>
): Promise<Record<string, any> | null> {
  try {
    const fc = getFirecrawl();
    const result = await fc.agent(args as any);
    return result as Record<string, any>;
  } catch (error: any) {
    console.error("[Firecrawl] Agent failed:", error.message);
    return null;
  }
}
