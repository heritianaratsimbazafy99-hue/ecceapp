create table if not exists public.content_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  assignment_id uuid references public.learning_assignments (id) on delete cascade,
  status text not null default 'completed' check (status = 'completed'),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_content_progress_assignment_unique
  on public.content_progress (organization_id, user_id, assignment_id)
  where assignment_id is not null;

create unique index if not exists idx_content_progress_content_unique
  on public.content_progress (organization_id, user_id, content_item_id)
  where assignment_id is null;

create index if not exists idx_content_progress_user_completed
  on public.content_progress (user_id, completed_at desc);

create index if not exists idx_content_progress_content_completed
  on public.content_progress (content_item_id, completed_at desc);

drop trigger if exists set_content_progress_updated_at on public.content_progress;
create trigger set_content_progress_updated_at
before update on public.content_progress
for each row execute function public.set_updated_at();

alter table public.content_progress enable row level security;

drop policy if exists "users and assigned staff can read content progress" on public.content_progress;
create policy "users and assigned staff can read content progress"
on public.content_progress
for select
using (
  auth.uid() = user_id
  or public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.can_coach_access_coachee(organization_id, user_id)
);

drop policy if exists "users can create own content progress" on public.content_progress;
create policy "users can create own content progress"
on public.content_progress
for insert
with check (
  auth.uid() = user_id
  and public.has_org_role(organization_id, 'coachee')
  and exists (
    select 1
    from public.content_items ci
    where ci.id = content_progress.content_item_id
      and ci.organization_id = content_progress.organization_id
      and ci.status = 'published'
  )
  and (
    assignment_id is null
    or exists (
      select 1
      from public.learning_assignments la
      where la.id = content_progress.assignment_id
        and la.organization_id = content_progress.organization_id
        and la.content_item_id = content_progress.content_item_id
        and (
          la.assigned_user_id = auth.uid()
          or (
            la.cohort_id is not null
            and exists (
              select 1
              from public.cohort_members cm
              where cm.cohort_id = la.cohort_id
                and cm.user_id = auth.uid()
            )
          )
        )
    )
  )
);

drop policy if exists "users can update own content progress" on public.content_progress;
create policy "users can update own content progress"
on public.content_progress
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status = 'completed'
  and exists (
    select 1
    from public.content_items ci
    where ci.id = content_progress.content_item_id
      and ci.organization_id = content_progress.organization_id
      and ci.status = 'published'
  )
);
