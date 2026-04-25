import fs from "node:fs";
import path from "node:path";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const VALID_ENVIRONMENTS = new Set(["development", "production", "test"]);

function parseArgs(argv) {
  const args = argv.slice(2);
  const reportOnly = args.includes("--report-only");
  const environmentArg = args.find((arg) => !arg.startsWith("--")) ?? "production";
  const environment = VALID_ENVIRONMENTS.has(environmentArg)
    ? environmentArg
    : "production";

  return {
    environment,
    reportOnly,
  };
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8");
  const entries = {};

  source.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    entries[key] = value;
  });

  return entries;
}

function loadResolvedEnv(environment) {
  const cwd = process.cwd();
  const fileNames = [
    ".env",
    `.env.${environment}`,
    ".env.local",
    `.env.${environment}.local`,
  ];

  return fileNames.reduce((accumulator, fileName) => {
    const filePath = path.join(cwd, fileName);
    return {
      ...accumulator,
      ...parseEnvFile(filePath),
    };
  }, {});
}

function resolveEnvValue(key, fileEnv) {
  const processValue = process.env[key];

  if (typeof processValue === "string" && processValue.trim()) {
    return processValue.trim();
  }

  const fileValue = fileEnv[key];
  return typeof fileValue === "string" && fileValue.trim() ? fileValue.trim() : null;
}

function main() {
  const { environment, reportOnly } = parseArgs(process.argv);
  const fileEnv = loadResolvedEnv(environment);
  const missingVars = REQUIRED_ENV_VARS.filter(
    (key) => !resolveEnvValue(key, fileEnv),
  );

  console.log(`Checking MindClone env readiness for "${environment}"...`);

  if (missingVars.length === 0) {
    console.log("All required environment variables are present.");
    return;
  }

  console.log("Missing environment variables:");
  missingVars.forEach((key) => {
    console.log(`- ${key}`);
  });

  console.log("");
  console.log("Fill them in via Vercel or your local .env files before deploying.");

  if (!reportOnly) {
    process.exitCode = 1;
  }
}

main();
