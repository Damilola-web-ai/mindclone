function normalizeBaseUrl(input) {
  if (!input) {
    return null;
  }

  try {
    const url = new URL(input);
    return url.origin;
  } catch {
    return null;
  }
}

async function main() {
  const inputUrl = process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const baseUrl = normalizeBaseUrl(inputUrl);

  if (!baseUrl) {
    console.error(
      "Pass a deployment URL, for example: npm run smoke:deploy -- https://your-domain.com",
    );
    process.exit(1);
  }

  const healthUrl = `${baseUrl}/api/health`;
  const response = await fetch(healthUrl, {
    headers: {
      accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`Health check failed for ${healthUrl}`);
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log(`Health check passed for ${healthUrl}`);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Smoke deployment check failed.",
  );
  process.exit(1);
});
