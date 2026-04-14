create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug citext not null,
  title text not null,
  description text,
  icon text,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null references public.badges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_quiz_attempt_id uuid references public.quiz_attempts (id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (badge_id, user_id)
);

create index if not exists idx_badges_organization_id on public.badges (organization_id);
create index if not exists idx_user_badges_user_id on public.user_badges (user_id, awarded_at desc);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "org members can read badges"
on public.badges
for select
using (public.is_org_member(organization_id));

create policy "staff can manage badges"
on public.badges
for all
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
)
with check (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
);

create policy "users can read own badges and staff can read all"
on public.user_badges
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.badges
    where id = badge_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

create policy "staff can award badges"
on public.user_badges
for all
using (
  exists (
    select 1
    from public.badges
    where id = badge_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
)
with check (
  exists (
    select 1
    from public.badges
    where id = badge_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

insert into storage.buckets (id, name, public)
values ('submission-files', 'submission-files', false)
on conflict (id) do nothing;
