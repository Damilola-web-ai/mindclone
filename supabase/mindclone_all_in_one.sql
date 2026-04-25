-- MindClone all-in-one Supabase bootstrap
-- Use this on a fresh Supabase project, or when you want one pasteable setup file
-- instead of running the four step-by-step migrations manually.

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists citext;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'memory_source_type'
  ) then
    create type public.memory_source_type as enum (
      'whatsapp',
      'journal',
      'voice_note',
      'twitter_archive',
      'writing'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'upload_status'
  ) then
    create type public.upload_status as enum (
      'pending',
      'processing',
      'completed',
      'failed'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'message_role'
  ) then
    create type public.message_role as enum (
      'user',
      'assistant'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'conversation_scope'
  ) then
    create type public.conversation_scope as enum (
      'public',
      'owner_private'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'owner_note_type'
  ) then
    create type public.owner_note_type as enum (
      'note',
      'task',
      'reminder'
    );
  end if;
end
$$;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.owner_profile (
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
  access_password_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint owner_profile_slug_format check (
    public_link_slug is null
    or public_link_slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

alter table public.owner_profile
  add column if not exists access_password_hash text;

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

create unique index if not exists owner_profile_singleton_idx
  on public.owner_profile ((true));

create table if not exists public.personality_quiz (
  id uuid primary key default gen_random_uuid(),
  question text not null unique,
  answer text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.corrections (
  id uuid primary key default gen_random_uuid(),
  original_response text not null,
  corrected_response text not null,
  topic text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.uploaded_sources (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text,
  source_type public.memory_source_type not null,
  status public.upload_status not null default 'pending',
  chunk_count integer not null default 0 check (chunk_count >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  uploaded_source_id uuid references public.uploaded_sources (id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  source_type public.memory_source_type not null,
  source_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_name text,
  scope public.conversation_scope not null default 'public',
  started_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.owner_notes (
  id uuid primary key default gen_random_uuid(),
  type public.owner_note_type not null default 'note',
  title text not null default '',
  content text not null default '',
  due_label text,
  is_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owner_notes_has_meaningful_text check (
    nullif(trim(title), '') is not null
    or nullif(trim(content), '') is not null
  )
);

create table if not exists public.message_memory_citations (
  id uuid primary key default gen_random_uuid(),
  assistant_message_id uuid not null references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  conversation_scope public.conversation_scope not null,
  memory_chunk_id uuid not null references public.memory_chunks (id) on delete cascade,
  uploaded_source_id uuid references public.uploaded_sources (id) on delete set null,
  source_name text not null,
  source_type public.memory_source_type not null,
  similarity double precision not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint message_memory_citations_unique_chunk_per_reply unique (
    assistant_message_id,
    memory_chunk_id
  )
);

create index if not exists conversations_started_at_idx
  on public.conversations (started_at desc);

create index if not exists corrections_created_at_idx
  on public.corrections (created_at desc);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

create index if not exists uploaded_sources_created_at_idx
  on public.uploaded_sources (created_at desc);

create index if not exists uploaded_sources_status_idx
  on public.uploaded_sources (status);

create index if not exists memory_chunks_source_type_idx
  on public.memory_chunks (source_type);

create index if not exists memory_chunks_uploaded_source_id_idx
  on public.memory_chunks (uploaded_source_id);

create index if not exists memory_chunks_embedding_idx
  on public.memory_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists owner_notes_type_idx
  on public.owner_notes (type);

create index if not exists owner_notes_is_complete_idx
  on public.owner_notes (is_complete);

create index if not exists owner_notes_created_at_idx
  on public.owner_notes (created_at desc);

create index if not exists message_memory_citations_scope_idx
  on public.message_memory_citations (conversation_scope);

create index if not exists message_memory_citations_uploaded_source_idx
  on public.message_memory_citations (uploaded_source_id);

create index if not exists message_memory_citations_created_at_idx
  on public.message_memory_citations (created_at desc);

drop trigger if exists set_owner_notes_updated_at on public.owner_notes;

create trigger set_owner_notes_updated_at
before update on public.owner_notes
for each row
execute function public.set_row_updated_at();

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
alter table public.owner_notes enable row level security;
alter table public.message_memory_citations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'owner_profile'
      and policyname = 'Owner can create singleton profile'
  ) then
    create policy "Owner can create singleton profile"
      on public.owner_profile
      for insert
      to authenticated
      with check (public.can_create_owner_profile(auth_user_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'owner_profile'
      and policyname = 'Owner can read own profile'
  ) then
    create policy "Owner can read own profile"
      on public.owner_profile
      for select
      to authenticated
      using (auth.uid() = auth_user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'owner_profile'
      and policyname = 'Owner can update own profile'
  ) then
    create policy "Owner can update own profile"
      on public.owner_profile
      for update
      to authenticated
      using (auth.uid() = auth_user_id)
      with check (auth.uid() = auth_user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'owner_profile'
      and policyname = 'Owner can delete own profile'
  ) then
    create policy "Owner can delete own profile"
      on public.owner_profile
      for delete
      to authenticated
      using (auth.uid() = auth_user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'personality_quiz'
      and policyname = 'Owner can manage quiz answers'
  ) then
    create policy "Owner can manage quiz answers"
      on public.personality_quiz
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'corrections'
      and policyname = 'Owner can manage corrections'
  ) then
    create policy "Owner can manage corrections"
      on public.corrections
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_sources'
      and policyname = 'Owner can manage uploaded sources'
  ) then
    create policy "Owner can manage uploaded sources"
      on public.uploaded_sources
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'memory_chunks'
      and policyname = 'Owner can manage memory chunks'
  ) then
    create policy "Owner can manage memory chunks"
      on public.memory_chunks
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'Owner can manage conversations'
  ) then
    create policy "Owner can manage conversations"
      on public.conversations
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Owner can manage messages'
  ) then
    create policy "Owner can manage messages"
      on public.messages
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'owner_notes'
      and policyname = 'Owner can manage owner notes'
  ) then
    create policy "Owner can manage owner notes"
      on public.owner_notes
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'message_memory_citations'
      and policyname = 'Owner can manage memory citations'
  ) then
    create policy "Owner can manage memory citations"
      on public.message_memory_citations
      for all
      to authenticated
      using (public.is_owner())
      with check (public.is_owner());
  end if;
end
$$;

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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read profile photos'
  ) then
    create policy "Public can read profile photos"
      on storage.objects
      for select
      to public
      using (bucket_id = 'profile-photos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Owner can manage profile photos'
  ) then
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
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Owner can manage training uploads'
  ) then
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
  end if;
end
$$;

grant execute on function public.get_public_owner_profile(text) to anon, authenticated;
grant execute on function public.match_memory_chunks(vector, integer, public.memory_source_type[]) to authenticated;
