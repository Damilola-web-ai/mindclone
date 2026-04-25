create table public.message_memory_citations (
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

create index message_memory_citations_scope_idx
  on public.message_memory_citations (conversation_scope);

create index message_memory_citations_uploaded_source_idx
  on public.message_memory_citations (uploaded_source_id);

create index message_memory_citations_created_at_idx
  on public.message_memory_citations (created_at desc);

alter table public.message_memory_citations enable row level security;

create policy "Owner can manage memory citations"
  on public.message_memory_citations
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());
