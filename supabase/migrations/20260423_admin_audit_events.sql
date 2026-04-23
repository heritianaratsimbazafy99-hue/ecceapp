create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  category text not null check (category in ('access', 'curriculum', 'delivery', 'organization')),
  action text not null,
  summary text not null,
  target_type text,
  target_id text,
  target_label text,
  target_user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_organization_created_at
  on public.audit_events (organization_id, created_at desc);

create index if not exists idx_audit_events_actor_id
  on public.audit_events (actor_id);

create index if not exists idx_audit_events_target_user_id
  on public.audit_events (target_user_id);

alter table public.audit_events enable row level security;

drop policy if exists "admins can read audit events" on public.audit_events;
create policy "admins can read audit events"
on public.audit_events
for select
using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "admins can create audit events" on public.audit_events;
create policy "admins can create audit events"
on public.audit_events
for insert
with check (public.has_org_role(organization_id, 'admin'));
