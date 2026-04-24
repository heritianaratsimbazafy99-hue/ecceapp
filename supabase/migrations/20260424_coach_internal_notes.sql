create table if not exists public.coach_conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, coach_id)
);

create index if not exists idx_coach_conversation_notes_coach_updated
  on public.coach_conversation_notes (coach_id, updated_at desc);

create index if not exists idx_coach_conversation_notes_follow_up
  on public.coach_conversation_notes (coach_id, next_follow_up_at)
  where next_follow_up_at is not null;

drop trigger if exists coach_conversation_notes_set_updated_at on public.coach_conversation_notes;
create trigger coach_conversation_notes_set_updated_at
before update on public.coach_conversation_notes
for each row execute function public.set_updated_at();

alter table public.coach_conversation_notes enable row level security;

drop policy if exists "coach owners and admins can read conversation notes" on public.coach_conversation_notes;
create policy "coach owners and admins can read conversation notes"
on public.coach_conversation_notes
for select
using (
  auth.uid() = coach_id
  or public.has_org_role(organization_id, 'admin')
);

drop policy if exists "coach owners can create conversation notes" on public.coach_conversation_notes;
create policy "coach owners can create conversation notes"
on public.coach_conversation_notes
for insert
with check (
  auth.uid() = coach_id
  and exists (
    select 1
    from public.coach_conversations cc
    where cc.id = coach_conversation_notes.conversation_id
      and cc.organization_id = coach_conversation_notes.organization_id
      and cc.coach_id = coach_conversation_notes.coach_id
  )
);

drop policy if exists "coach owners can update conversation notes" on public.coach_conversation_notes;
create policy "coach owners can update conversation notes"
on public.coach_conversation_notes
for update
using (
  auth.uid() = coach_id
)
with check (
  auth.uid() = coach_id
  and exists (
    select 1
    from public.coach_conversations cc
    where cc.id = coach_conversation_notes.conversation_id
      and cc.organization_id = coach_conversation_notes.organization_id
      and cc.coach_id = coach_conversation_notes.coach_id
  )
);

drop policy if exists "coach owners can delete conversation notes" on public.coach_conversation_notes;
create policy "coach owners can delete conversation notes"
on public.coach_conversation_notes
for delete
using (
  auth.uid() = coach_id
);
