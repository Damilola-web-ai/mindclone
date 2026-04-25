# MindClone

MindClone is a personal AI chatbot app that will learn from an owner's quiz
answers, uploaded memories, and ongoing corrections so visitors feel like they
are talking to the real person.

## Step 12 Status

The foundation, Supabase layer, owner auth flow, personality quiz, and training
pipeline are complete, the public visitor chat is live, and the owner-only
private assistant mode is now live too. The correction system and analytics
dashboard are live as well. The real profile settings are live now too, and the
polish pass is finished. Deployment prep is in place too:

- Next.js 14 App Router scaffold
- Tailwind CSS design system and global tokens
- shadcn-style project baseline with reusable UI primitives
- Route shells for `/chat` and the owner dashboard areas
- Responsive marketing, visitor, and owner layouts
- Supabase browser/server/admin clients
- Auth session refresh middleware
- SQL migration for tables, pgvector, RLS, and storage buckets
- `.env.example` and `supabase/README.md` setup docs
- Owner sign-up and sign-in page
- Protected dashboard access with sign-out
- Multi-step personality quiz backed by Supabase
- System prompt generation and manual prompt editing on the quiz route
- Training uploads with source-type selection and secure storage writes
- File parsing for `.txt`, `.pdf`, `.docx`, and Twitter archive `.json`
- Voice note transcription through Gemini file understanding
- Chunking and Gemini embeddings for pgvector-backed memory storage
- Uploaded source list with status badges, chunk counts, and deletion
- Visitor-facing profile page with start-chat flow
- Public chat API route with RAG retrieval and Gemini streaming
- Conversation and message persistence for visitor transcripts
- Shareable `/chat` plus `/talk-to-{slug}` route support
- Owner-only `/dashboard/private` assistant workspace
- `owner_notes` table and UI for tasks, notes, and reminders
- Private assistant chat route that uses both long-term memory and current owner notes
- Fresh-thread flow plus persisted owner-private transcripts
- Transcript review workspace on `/dashboard/corrections`
- Correction creation and deletion actions backed by Supabase
- Saved corrections now get appended back into future public and private prompts as durable rules
- Memory-citation tracking for assistant replies grounded in uploaded sources
- Owner analytics dashboard with visitor totals, message volume, topic summaries, recent transcripts, and source-usage rankings
- Owner settings workspace for display name, bio, greeting, profile photo, slug, and visitor rules
- Private public-link password gate with cookie-based unlock flow for visitors
- Public chat page and API now respect owner visibility settings in real time
- Global toast notifications for key owner and visitor actions
- Route-level loading skeletons for the remaining dashboard and public chat flows
- Mobile-safe spacing and scroll behavior for public and private chat transcripts
- Polished owner shell with sticky header treatment and smoother small-screen navigation
- `/api/health` deployment smoke-check endpoint for Vercel verification
- Explicit Vercel-friendly `maxDuration` and `preferredRegion` config on the slow AI and training surfaces
- `check:env`, `release:check`, `smoke:deploy`, and Vercel build/deploy npm scripts
- `docs/vercel-deployment.md` launch guide for Supabase setup, Vercel envs, rollout, and smoke testing

## Project Structure

```text
app/
  auth/
  dashboard/
  chat/
components/
  auth/
  dashboard/
  layout/
  ui/
lib/
  supabase/
hooks/
docs/
scripts/
supabase/
  migrations/
```

## Commands

```bash
npm install
npm run dev
npm run check:env
npm run lint
npm run typecheck
npm run release:check
npm run smoke:deploy -- https://your-deployment-url.com
```

## Launch Notes

The codebase is deployment-ready, but I did not perform a live Vercel rollout
from this workspace because real Vercel, Supabase, and Gemini
credentials are not available here. Use [docs/vercel-deployment.md](docs/vercel-deployment.md)
to connect the real project and ship it.
