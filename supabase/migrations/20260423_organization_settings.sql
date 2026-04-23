create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  display_name text,
  short_name text,
  platform_tagline text,
  marketing_headline text,
  marketing_subheadline text,
  support_email text,
  support_phone text,
  website_url text,
  default_timezone text not null default 'Indian/Antananarivo',
  default_locale text not null default 'fr',
  allow_coach_self_schedule boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organization_settings (organization_id)
select id
from public.organizations
on conflict (organization_id) do nothing;

drop trigger if exists organization_settings_set_updated_at on public.organization_settings;
create trigger organization_settings_set_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

alter table public.organization_settings enable row level security;

drop policy if exists "organization members can read settings" on public.organization_settings;
create policy "organization members can read settings"
on public.organization_settings
for select
using (public.is_org_member(organization_id));

drop policy if exists "admins can manage settings" on public.organization_settings;
create policy "admins can manage settings"
on public.organization_settings
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));
