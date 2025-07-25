import { createBrowserClient } from "@supabase/ssr";

async function fetchWithRetry(
  url: string | URL | Request,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRetriableError =
        error instanceof Error &&
        (error.message.includes("ERR_INSUFFICIENT_RESOURCES") ||
          error.message.includes("ERR_NETWORK_CHANGED") ||
          error.message.includes("ERR_INTERNET_DISCONNECTED") ||
          error.message.includes("ERR_NETWORK_IO_SUSPENDED") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT"));

      if (isRetriableError && !isLastAttempt) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: fetchWithRetry,
      },
    }
  );
}
