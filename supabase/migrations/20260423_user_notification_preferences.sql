create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  allow_learning_notifications boolean not null default true,
  allow_message_notifications boolean not null default true,
  allow_review_notifications boolean not null default true,
  allow_reward_notifications boolean not null default true,
  allow_session_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_notification_preferences (user_id, organization_id)
select id, organization_id
from public.profiles
on conflict (user_id) do nothing;

create index if not exists idx_user_notification_preferences_organization_id
  on public.user_notification_preferences (organization_id);

drop trigger if exists user_notification_preferences_set_updated_at on public.user_notification_preferences;
create trigger user_notification_preferences_set_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_updated_at();

alter table public.user_notification_preferences enable row level security;

drop policy if exists "users can read own notification preferences" on public.user_notification_preferences;
create policy "users can read own notification preferences"
on public.user_notification_preferences
for select
using (
  auth.uid() = user_id
  or public.has_org_role(organization_id, 'admin')
);

drop policy if exists "users can manage own notification preferences" on public.user_notification_preferences;
create policy "users can manage own notification preferences"
on public.user_notification_preferences
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.is_org_member(organization_id)
);
