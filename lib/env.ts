const EMPTY_ENV_ERROR = "Missing required environment variable";

type EnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "GEMINI_API_KEY"
  | "RESEND_API_KEY"
  | "NEXT_PUBLIC_APP_URL";

function readEnv(name: EnvName) {
  const value = process.env[name];

  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requireEnv(name: EnvName) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${EMPTY_ENV_ERROR}: ${name}`);
  }

  return value;
}

export function hasSupabaseClientEnv() {
  return Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export function hasSupabaseAdminEnv() {
  return Boolean(
    hasSupabaseClientEnv() && readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

export function hasGeminiEnv() {
  return Boolean(readEnv("GEMINI_API_KEY"));
}

export function getSupabaseClientEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseAdminEnv() {
  return {
    ...getSupabaseClientEnv(),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getOptionalAppUrl() {
  return readEnv("NEXT_PUBLIC_APP_URL");
}
