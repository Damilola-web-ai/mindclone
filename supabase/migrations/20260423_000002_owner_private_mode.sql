create type public.owner_note_type as enum (
  'note',
  'task',
  'reminder'
);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.owner_notes (
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

create index owner_notes_type_idx
  on public.owner_notes (type);

create index owner_notes_is_complete_idx
  on public.owner_notes (is_complete);

create index owner_notes_created_at_idx
  on public.owner_notes (created_at desc);

create trigger set_owner_notes_updated_at
before update on public.owner_notes
for each row
execute function public.set_row_updated_at();

alter table public.owner_notes enable row level security;

create policy "Owner can manage owner notes"
  on public.owner_notes
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());
