import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseClientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type WritableCookieStore = ReturnType<typeof cookies> & {
  set?: (name: string, value: string, options?: CookieOptions) => void;
};

export function getSupabaseServerClient(): SupabaseClient<Database> {
  const cookieStore = cookies() as WritableCookieStore;
  const { url, anonKey } = getSupabaseClientEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set?.(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware handles refreshes.
        }
      },
    },
  });
}
