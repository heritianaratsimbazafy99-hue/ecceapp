insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do update
set public = false;

drop policy if exists "staff can manage content"
  on public.content_items;

create policy "staff can manage content"
on public.content_items
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

drop policy if exists "admins can manage content taxonomy themes"
  on public.content_taxonomy_themes;

drop policy if exists "staff can manage content taxonomy themes"
  on public.content_taxonomy_themes;

create policy "staff can manage content taxonomy themes"
on public.content_taxonomy_themes
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

drop policy if exists "admins can manage content taxonomy subthemes"
  on public.content_taxonomy_subthemes;

drop policy if exists "staff can manage content taxonomy subthemes"
  on public.content_taxonomy_subthemes;

create policy "staff can manage content taxonomy subthemes"
on public.content_taxonomy_subthemes
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
