import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseClientEnv, hasSupabaseClientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type ResponseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSupabaseSession(request: NextRequest) {
  if (!hasSupabaseClientEnv()) {
    return NextResponse.next({ request });
  }

  const { url, anonKey } = getSupabaseClientEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        cookiesToSet.forEach(({ name, value, options }: ResponseCookie) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
