create table if not exists public.content_taxonomy_themes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null,
  description text,
  position integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (organization_id, label)
);

create table if not exists public.content_taxonomy_subthemes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  theme_id uuid not null references public.content_taxonomy_themes (id) on delete cascade,
  label text not null,
  topics text[] not null default '{}',
  position integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (theme_id, label)
);

create index if not exists idx_content_taxonomy_themes_org_position
  on public.content_taxonomy_themes (organization_id, position, label);

create index if not exists idx_content_taxonomy_subthemes_theme_position
  on public.content_taxonomy_subthemes (theme_id, position, label);

create index if not exists idx_content_taxonomy_subthemes_org_position
  on public.content_taxonomy_subthemes (organization_id, position, label);

alter table public.content_taxonomy_themes enable row level security;
alter table public.content_taxonomy_subthemes enable row level security;

drop policy if exists "organization members can read content taxonomy themes"
  on public.content_taxonomy_themes;

create policy "organization members can read content taxonomy themes"
on public.content_taxonomy_themes
for select
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
  or public.has_org_role(organization_id, 'coachee')
);

drop policy if exists "admins can manage content taxonomy themes"
  on public.content_taxonomy_themes;

create policy "admins can manage content taxonomy themes"
on public.content_taxonomy_themes
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

drop policy if exists "organization members can read content taxonomy subthemes"
  on public.content_taxonomy_subthemes;

create policy "organization members can read content taxonomy subthemes"
on public.content_taxonomy_subthemes
for select
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
  or public.has_org_role(organization_id, 'coachee')
);

drop policy if exists "admins can manage content taxonomy subthemes"
  on public.content_taxonomy_subthemes;

create policy "admins can manage content taxonomy subthemes"
on public.content_taxonomy_subthemes
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

with theme_seed(label, description, position) as (
  values
    ('Fondamentaux', 'Cadre, vocabulaire et posture de base pour sécuriser les premières séances.', 10),
    ('Pratique coach', 'Ressources directement activables avant, pendant ou après une séance.', 20),
    ('Business coaching', 'Contenus pour structurer l''offre, la prospection et la conversion.', 30),
    ('Progression apprenant', 'Repères pour suivre les coachés, repérer les risques et consolider les acquis.', 40)
)
insert into public.content_taxonomy_themes (organization_id, label, description, position)
select organizations.id, theme_seed.label, theme_seed.description, theme_seed.position
from public.organizations
cross join theme_seed
on conflict (organization_id, label) do nothing;

with subtheme_seed(theme_label, label, topics, position) as (
  values
    ('Fondamentaux', 'Cadre de séance', array['contrat', 'objectif', 'alliance', 'cadre', 'séance'], 10),
    ('Fondamentaux', 'Posture coach', array['écoute', 'questionnement', 'neutralité', 'présence', 'éthique'], 20),
    ('Pratique coach', 'Diagnostic', array['besoin', 'blocage', 'objectif', 'priorisation', 'diagnostic'], 10),
    ('Pratique coach', 'Outils et scripts', array['template', 'script', 'exercice', 'trame', 'support'], 20),
    ('Business coaching', 'Offre et positionnement', array['niche', 'promesse', 'offre', 'positionnement', 'prix'], 10),
    ('Business coaching', 'Acquisition client', array['prospection', 'contenu', 'vente', 'conversion', 'rendez-vous'], 20),
    ('Progression apprenant', 'Engagement', array['assiduité', 'motivation', 'deadline', 'relance', 'engagement'], 10),
    ('Progression apprenant', 'Évaluation', array['quiz', 'feedback', 'preuve', 'compétence', 'maîtrise'], 20)
)
insert into public.content_taxonomy_subthemes (organization_id, theme_id, label, topics, position)
select themes.organization_id, themes.id, subtheme_seed.label, subtheme_seed.topics, subtheme_seed.position
from subtheme_seed
join public.content_taxonomy_themes themes
  on themes.label = subtheme_seed.theme_label
on conflict (theme_id, label) do nothing;
