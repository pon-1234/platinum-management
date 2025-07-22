import "@testing-library/jest-dom";
import { vi } from "vitest";

// 環境変数の設定
process.env.NEXT_PUBLIC_SUPABASE_URL =
  "https://pdomeeyvatachcothudq.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMyNzIsImV4cCI6MjA2ODY2OTI3Mn0.fFmyB6vBbZMDoV732iAaqGr4WDsb9In8K-87gp0E5Ak";
process.env.SUPABASE_URL = "https://pdomeeyvatachcothudq.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkb21lZXl2YXRhY2hjb3RodWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5MzI3MiwiZXhwIjoyMDY4NjY5MjcyfQ.HhYDbfwZeSUmKmkftQZ492LKdTTHP_ORwmqnEyxZVNA";

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user: null, session: null }, error: null })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// @supabase/ssrのモック
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn((url, key) => ({
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user: null, session: null }, error: null })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));
