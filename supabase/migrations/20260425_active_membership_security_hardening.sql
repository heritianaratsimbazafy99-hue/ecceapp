create or replace function public.has_org_role(target_organization uuid, expected_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    join public.profiles
      on profiles.id = user_roles.user_id
      and profiles.organization_id = user_roles.organization_id
    where user_roles.organization_id = target_organization
      and user_roles.user_id = auth.uid()
      and user_roles.role = expected_role
      and profiles.status = 'active'
  );
$$;

create or replace function public.protect_profile_self_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.has_org_role(old.organization_id, 'admin') then
    new.id := old.id;
    new.organization_id := old.organization_id;
    new.status := old.status;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_self_security_fields on public.profiles;
create trigger profiles_protect_self_security_fields
before update of id, organization_id, status, created_at on public.profiles
for each row execute function public.protect_profile_self_security_fields();

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id and status = 'active')
with check (auth.uid() = id and status = 'active');
