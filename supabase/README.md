# Supabase Setup

This project now includes the full Step 2 foundation for Supabase auth,
database tables, storage buckets, row-level security, and pgvector retrieval.

## Files

- `supabase/migrations/20260423_000001_mindclone_foundation.sql`
- `supabase/migrations/20260423_000002_owner_private_mode.sql`
- `supabase/migrations/20260423_000003_analytics_tracking.sql`
- `supabase/migrations/20260423_000004_profile_settings.sql`
- `supabase/mindclone_all_in_one.sql`
- `.env.example`

## What The Migrations Create

- Extensions: `pgcrypto`, `vector`, `citext`
- Core tables for owner profile, quiz answers, corrections, uploads, memory chunks, conversations, and messages
- An `owner_notes` table for private notes, tasks, and reminders
- A singleton owner constraint so only one owner profile can exist
- Row-level security policies for owner-only management
- Public-safe owner profile RPC: `get_public_owner_profile`
- Memory retrieval RPC: `match_memory_chunks`
- Storage buckets:
  - `profile-photos`
  - `training-uploads`
- Analytics tracking tables and helper fields used by the dashboard
- `owner_profile.access_password_hash` for private public-link password protection

## Apply It In Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the real keys.
3. Open the Supabase SQL Editor.
4. Run the SQL from these files in order:
   - `supabase/migrations/20260423_000001_mindclone_foundation.sql`
   - `supabase/migrations/20260423_000002_owner_private_mode.sql`
   - `supabase/migrations/20260423_000003_analytics_tracking.sql`
   - `supabase/migrations/20260423_000004_profile_settings.sql`

If you want the easiest setup path on a fresh Supabase project, paste and run
`supabase/mindclone_all_in_one.sql` instead.

If you prefer the CLI later, you can link the project and push the migration
from this `supabase/migrations` folder.

## Notes

- The public visitor experience still goes through server-side app logic later.
- The raw training tables remain owner-only.
- Profile photos are readable publicly by design because they appear on the
  public chat profile page.
- If owner sign-up fails while "reserving" the owner profile, the most common
  cause is that migration `20260423_000004_profile_settings.sql` was skipped.
