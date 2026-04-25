import packageJson from "@/package.json";
import { getOptionalAppUrl, hasGeminiEnv, hasSupabaseAdminEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const maxDuration = 15;

type ServiceStatus = {
  message: string;
  status: "error" | "missing_env" | "ready";
};

function getDeploymentEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
}

async function getSupabaseStatus(): Promise<ServiceStatus> {
  if (!hasSupabaseAdminEnv()) {
    return {
      message: "Missing Supabase environment variables.",
      status: "missing_env",
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("owner_profile")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      throw error;
    }

    return {
      message: "Supabase is reachable.",
      status: "ready",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Supabase could not be reached from this deployment.",
      status: "error",
    };
  }
}

function getModelStatus(label: string, isConfigured: boolean): ServiceStatus {
  return isConfigured
    ? {
        message: `${label} environment variable is configured.`,
        status: "ready",
      }
    : {
        message: `${label} environment variable is missing.`,
        status: "missing_env",
      };
}

export async function GET() {
  const supabase = await getSupabaseStatus();
  const gemini = getModelStatus("GEMINI_API_KEY", hasGeminiEnv());

  const services = {
    gemini,
    supabase,
  };
  const hasBlockingIssue = Object.values(services).some(
    (service) => service.status !== "ready",
  );

  return Response.json(
    {
      appUrl: getOptionalAppUrl(),
      environment: getDeploymentEnvironment(),
      status: hasBlockingIssue ? "degraded" : "ok",
      services,
      timestamp: new Date().toISOString(),
      version: packageJson.version,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
      status: hasBlockingIssue ? 503 : 200,
    },
  );
}
