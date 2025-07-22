import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            retry: {
              times: 3,
              delay: (attempt) => Math.pow(2, attempt) * 1000,
            },
          }).catch(async (error) => {
            if (error.message.includes("ERR_INSUFFICIENT_RESOURCES")) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              return fetch(url, options);
            }
            throw error;
          });
        },
      },
    }
  );
}
