create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists citext;

create type public.memory_source_type as enum (
  'whatsapp',
  'journal',
  'voice_note',
  'twitter_archive',
  'writing'
);

create type public.upload_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

create type public.message_role as enum (
  'user',
  'assistant'
);

create type public.conversation_scope as enum (
  'public',
  'owner_private'
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.owner_profile
    where auth_user_id = auth.uid()
  );
$$;

create or replace function public.can_create_owner_profile(target_auth_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_auth_user_id
    and not exists (
      select 1
      from public.owner_profile
    );
$$;

create table public.owner_profile (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default '',
  photo_url text,
  bio text not null default '',
  greeting text not null default '',
  public_link_slug citext unique,
  is_public boolean not null default true,
  require_visitor_name boolean not null default false,
  system_prompt text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint owner_profile_slug_format check (
    public_link_slug is null
    or public_link_slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create unique index owner_profile_singleton_idx
  on public.owner_profile ((true));

create table public.personality_quiz (
  id uuid primary key default gen_random_uuid(),
  question text not null unique,
  answer text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  original_response text not null,
  corrected_response text not null,
  topic text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.uploaded_sources (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text,
  source_type public.memory_source_type not null,
  status public.upload_status not null default 'pending',
  chunk_count integer not null default 0 check (chunk_count >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  uploaded_source_id uuid references public.uploaded_sources (id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  source_type public.memory_source_type not null,
  source_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_name text,
  scope public.conversation_scope not null default 'public',
  started_at timestamptz not null default timezone('utc', now())
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index conversations_started_at_idx
  on public.conversations (started_at desc);

create index corrections_created_at_idx
  on public.corrections (created_at desc);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

create index uploaded_sources_created_at_idx
  on public.uploaded_sources (created_at desc);

create index uploaded_sources_status_idx
  on public.uploaded_sources (status);

create index memory_chunks_source_type_idx
  on public.memory_chunks (source_type);

create index memory_chunks_uploaded_source_id_idx
  on public.memory_chunks (uploaded_source_id);

create index memory_chunks_embedding_idx
  on public.memory_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_memory_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
  source_types public.memory_source_type[] default null
)
returns table (
  id uuid,
  uploaded_source_id uuid,
  content text,
  source_type public.memory_source_type,
  source_name text,
  created_at timestamptz,
  similarity double precision
)
language sql
stable
set search_path = public
as $$
  select
    mc.id,
    mc.uploaded_source_id,
    mc.content,
    mc.source_type,
    mc.source_name,
    mc.created_at,
    1 - (mc.embedding <=> query_embedding) as similarity
  from public.memory_chunks mc
  where source_types is null
    or mc.source_type = any(source_types)
  order by mc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.get_public_owner_profile(profile_slug text default null)
returns table (
  id uuid,
  name text,
  photo_url text,
  bio text,
  greeting text,
  public_link_slug citext,
  is_public boolean,
  require_visitor_name boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    op.id,
    op.name,
    op.photo_url,
    op.bio,
    op.greeting,
    op.public_link_slug,
    op.is_public,
    op.require_visitor_name,
    op.created_at
  from public.owner_profile op
  where op.is_public = true
    and (
      profile_slug is null
      or op.public_link_slug = profile_slug::citext
    )
  limit 1;
$$;

alter table public.owner_profile enable row level security;
alter table public.personality_quiz enable row level security;
alter table public.corrections enable row level security;
alter table public.uploaded_sources enable row level security;
alter table public.memory_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Owner can create singleton profile"
  on public.owner_profile
  for insert
  to authenticated
  with check (public.can_create_owner_profile(auth_user_id));

create policy "Owner can read own profile"
  on public.owner_profile
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

create policy "Owner can update own profile"
  on public.owner_profile
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "Owner can delete own profile"
  on public.owner_profile
  for delete
  to authenticated
  using (auth.uid() = auth_user_id);

create policy "Owner can manage quiz answers"
  on public.personality_quiz
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Owner can manage corrections"
  on public.corrections
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Owner can manage uploaded sources"
  on public.uploaded_sources
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Owner can manage memory chunks"
  on public.memory_chunks
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Owner can manage conversations"
  on public.conversations
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Owner can manage messages"
  on public.messages
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'profile-photos',
    'profile-photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'training-uploads',
    'training-uploads',
    false,
    52428800,
    array[
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mp4',
      'audio/m4a',
      'audio/mpeg',
      'text/plain'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read profile photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-photos');

create policy "Owner can manage profile photos"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and public.is_owner()
  )
  with check (
    bucket_id = 'profile-photos'
    and public.is_owner()
  );

create policy "Owner can manage training uploads"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'training-uploads'
    and public.is_owner()
  )
  with check (
    bucket_id = 'training-uploads'
    and public.is_owner()
  );

grant execute on function public.get_public_owner_profile(text) to anon, authenticated;
grant execute on function public.match_memory_chunks(vector, integer, public.memory_source_type[]) to authenticated;
