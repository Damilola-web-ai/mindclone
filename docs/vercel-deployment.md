# MindClone Vercel Deployment

This project is ready for a Vercel rollout once the real Supabase and Gemini
credentials are available.

## 1. Prepare Supabase first

Apply the migrations in order:

```bash
supabase/migrations/20260423_000001_mindclone_foundation.sql
supabase/migrations/20260423_000002_owner_private_mode.sql
supabase/migrations/20260423_000003_analytics_tracking.sql
supabase/migrations/20260423_000004_profile_settings.sql
```

These migrations create the tables, vector support, RLS rules, helper
functions, and storage buckets that the deployed app expects.

## 2. Configure environment variables in Vercel

Add these variables to the Vercel project for `Production`, `Preview`, and
`Development` as needed:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

Use the final production URL or custom domain for `NEXT_PUBLIC_APP_URL`, for
example:

```text
NEXT_PUBLIC_APP_URL=https://mindclone.yourdomain.com
```

Notes:

- `NEXT_PUBLIC_*` values are safe to expose to the browser.
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `RESEND_API_KEY` must stay
  server-only.
- If you change env vars in Vercel later, redeploy so all routes pick them up.

## 3. Link the repo and pull envs locally

```bash
npx vercel link
npx vercel env pull .env.local --environment=production --yes
```

You can validate the resolved env set with:

```bash
npm run check:env
```

## 4. Run the release checks locally

```bash
npm run release:check
```

That runs lint, typecheck, and a production build before any deployment.

## 5. Build and deploy with Vercel

Preview deployment:

```bash
npx vercel
```

Production build plus prebuilt production deploy:

```bash
npm run vercel:build
npm run vercel:deploy:prod
```

This repo uses prebuilt deployment so the exact build you validate locally is
the one uploaded to Vercel.

## 6. Smoke-test the deployment

MindClone now includes a health endpoint:

```text
/api/health
```

It reports whether:

- Supabase is reachable from the deployment
- `GEMINI_API_KEY` is present

You can run the scripted smoke check:

```bash
npm run smoke:deploy -- https://your-production-domain.com
```

Or hit the endpoint directly:

```bash
curl https://your-production-domain.com/api/health
```

## 7. Manual launch checklist

After the health check passes, verify:

1. Owner sign-up/sign-in works.
2. `/dashboard/train` can upload and process a sample file.
3. `/chat` or the public slug route loads the profile and can stream a reply.
4. `/dashboard/private` streams a private owner reply.
5. `/dashboard/settings` saves a new greeting and slug, and the public page updates.
6. The password-protected public link unlock flow works when `is_public` is off.

## Deployment-specific notes

- Public and private AI routes are pinned to the Node.js runtime and given
  explicit `maxDuration` values for streaming.
- The training route segment has a longer `maxDuration` because embeddings and
  file processing are the slowest part of the app.
- The dashboard segment and API routes prefer the Vercel `home` region to keep
  Supabase access and owner actions close to the primary data region.
