create table if not exists public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  coachee_id uuid references public.profiles (id) on delete cascade,
  cohort_id uuid references public.cohorts (id) on delete cascade,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check ((coachee_id is not null) <> (cohort_id is not null))
);

create index if not exists idx_coach_assignments_coach_id
  on public.coach_assignments (coach_id, created_at desc);

create index if not exists idx_coach_assignments_coachee_id
  on public.coach_assignments (coachee_id, created_at desc);

create index if not exists idx_coach_assignments_cohort_id
  on public.coach_assignments (cohort_id, created_at desc);

create unique index if not exists idx_coach_assignments_unique_coachee
  on public.coach_assignments (organization_id, coach_id, coachee_id)
  where coachee_id is not null;

create unique index if not exists idx_coach_assignments_unique_cohort
  on public.coach_assignments (organization_id, coach_id, cohort_id)
  where cohort_id is not null;

alter table public.coach_assignments enable row level security;

create policy "admins and involved members can read coach assignments"
on public.coach_assignments
for select
using (
  public.has_org_role(organization_id, 'admin')
  or auth.uid() = coach_id
  or auth.uid() = coachee_id
  or (
    cohort_id is not null
    and exists (
      select 1
      from public.cohort_members
      where cohort_members.cohort_id = coach_assignments.cohort_id
        and cohort_members.user_id = auth.uid()
    )
  )
);

create policy "admins can manage coach assignments"
on public.coach_assignments
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));
