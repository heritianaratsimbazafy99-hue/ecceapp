create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  coachee_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, coach_id, coachee_id),
  check (coach_id <> coachee_id)
);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_coach_conversations_coach_id
  on public.coach_conversations (coach_id, updated_at desc);

create index if not exists idx_coach_conversations_coachee_id
  on public.coach_conversations (coachee_id, updated_at desc);

create index if not exists idx_coach_messages_conversation_id
  on public.coach_messages (conversation_id, created_at desc);

create index if not exists idx_coach_messages_recipient_id
  on public.coach_messages (recipient_id, read_at, created_at desc);

create or replace function public.touch_coach_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.coach_conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists coach_conversations_set_updated_at on public.coach_conversations;
create trigger coach_conversations_set_updated_at
before update on public.coach_conversations
for each row execute function public.set_updated_at();

drop trigger if exists coach_messages_touch_conversation on public.coach_messages;
create trigger coach_messages_touch_conversation
after insert on public.coach_messages
for each row execute function public.touch_coach_conversation_updated_at();

alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;

drop policy if exists "participants can read coach conversations" on public.coach_conversations;
create policy "participants can read coach conversations"
on public.coach_conversations
for select
using (
  auth.uid() = coach_id
  or auth.uid() = coachee_id
  or public.has_org_role(organization_id, 'admin')
);

drop policy if exists "participants can create coach conversations" on public.coach_conversations;
create policy "participants can create coach conversations"
on public.coach_conversations
for insert
with check (
  (
    auth.uid() = coach_id
    or auth.uid() = coachee_id
    or public.has_org_role(organization_id, 'admin')
  )
  and exists (
    select 1
    from public.user_roles
    where organization_id = coach_conversations.organization_id
      and user_id = coach_conversations.coach_id
      and role = 'coach'
  )
  and exists (
    select 1
    from public.user_roles
    where organization_id = coach_conversations.organization_id
      and user_id = coach_conversations.coachee_id
      and role = 'coachee'
  )
);

drop policy if exists "participants can read coach messages" on public.coach_messages;
create policy "participants can read coach messages"
on public.coach_messages
for select
using (
  auth.uid() = sender_id
  or auth.uid() = recipient_id
  or public.has_org_role(organization_id, 'admin')
);

drop policy if exists "participants can send coach messages" on public.coach_messages;
create policy "participants can send coach messages"
on public.coach_messages
for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.coach_conversations
    where id = coach_messages.conversation_id
      and organization_id = coach_messages.organization_id
      and (
        (coach_id = coach_messages.sender_id and coachee_id = coach_messages.recipient_id)
        or (coachee_id = coach_messages.sender_id and coach_id = coach_messages.recipient_id)
      )
  )
);

drop policy if exists "recipients can mark coach messages as read" on public.coach_messages;
create policy "recipients can mark coach messages as read"
on public.coach_messages
for update
using (
  auth.uid() = recipient_id
  or public.has_org_role(organization_id, 'admin')
)
with check (
  auth.uid() = recipient_id
  or public.has_org_role(organization_id, 'admin')
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'coach_messages'
  ) then
    alter publication supabase_realtime add table public.coach_messages;
  end if;
end
$$;
