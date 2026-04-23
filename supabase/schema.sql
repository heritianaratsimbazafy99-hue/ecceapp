create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.app_role as enum ('admin', 'professor', 'coach', 'coachee');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.publication_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.content_type as enum ('document', 'video', 'youtube', 'audio', 'link', 'replay', 'template');
create type public.quiz_kind as enum ('qcm', 'quiz', 'assessment');
create type public.attempt_status as enum ('in_progress', 'submitted', 'graded', 'expired');
create type public.submission_status as enum ('not_started', 'submitted', 'reviewed', 'late');
create type public.notification_channel as enum ('in_app', 'email');
create type public.session_status as enum ('planned', 'completed', 'cancelled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  bio text,
  timezone text not null default 'Indian/Antananarivo',
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.user_roles (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, role)
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug citext not null,
  description text,
  starts_on date,
  ends_on date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.cohort_members (
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

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

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  slug citext not null,
  description text,
  status public.publication_status not null default 'draft',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.program_modules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  status public.publication_status not null default 'draft',
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_enrollments (
  program_id uuid not null references public.programs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  cohort_id uuid references public.cohorts (id) on delete set null,
  enrolled_at timestamptz not null default now(),
  primary key (program_id, user_id)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_id uuid references public.program_modules (id) on delete set null,
  title text not null,
  slug citext not null,
  summary text,
  category text,
  subcategory text,
  tags text[] not null default '{}',
  content_type public.content_type not null,
  status public.publication_status not null default 'draft',
  external_url text,
  storage_path text,
  youtube_url text,
  is_required boolean not null default false,
  position integer not null default 0,
  estimated_minutes integer,
  created_by uuid references public.profiles (id),
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_id uuid references public.program_modules (id) on delete set null,
  content_item_id uuid references public.content_items (id) on delete set null,
  title text not null,
  description text,
  kind public.quiz_kind not null default 'quiz',
  status public.publication_status not null default 'draft',
  passing_score numeric(5,2),
  attempts_allowed integer not null default 1,
  time_limit_minutes integer,
  randomize_questions boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  helper_text text,
  question_type text not null,
  position integer not null default 0,
  points numeric(5,2) not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  position integer not null default 0
);

create table if not exists public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  cohort_id uuid references public.cohorts (id) on delete cascade,
  assigned_user_id uuid references public.profiles (id) on delete cascade,
  content_item_id uuid references public.content_items (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete cascade,
  due_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (cohort_id is not null or assigned_user_id is not null),
  check (content_item_id is not null or quiz_id is not null)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid references public.learning_assignments (id) on delete set null,
  attempt_number integer not null default 1,
  status public.attempt_status not null default 'in_progress',
  score numeric(5,2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz
);

create table if not exists public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  choice_id uuid references public.quiz_question_choices (id) on delete set null,
  answer_text text,
  is_correct boolean,
  points_awarded numeric(5,2),
  primary key (attempt_id, question_id)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.learning_assignments (id) on delete set null,
  content_item_id uuid references public.content_items (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  storage_path text,
  status public.submission_status not null default 'not_started',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  grade numeric(5,2),
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  coachee_id uuid not null references public.profiles (id) on delete cascade,
  cohort_id uuid references public.cohorts (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.session_status not null default 'planned',
  video_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coaching_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coaching_sessions (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  summary text,
  blockers text,
  next_actions text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text,
  channel public.notification_channel not null default 'in_app',
  deeplink text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_organization_id on public.profiles (organization_id);
create index if not exists idx_user_notification_preferences_organization_id on public.user_notification_preferences (organization_id);
create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_cohorts_organization_id on public.cohorts (organization_id);
create index if not exists idx_coach_assignments_coach_id on public.coach_assignments (coach_id, created_at desc);
create index if not exists idx_coach_assignments_coachee_id on public.coach_assignments (coachee_id, created_at desc);
create index if not exists idx_coach_assignments_cohort_id on public.coach_assignments (cohort_id, created_at desc);
create unique index if not exists idx_coach_assignments_unique_coachee
  on public.coach_assignments (organization_id, coach_id, coachee_id)
  where coachee_id is not null;
create unique index if not exists idx_coach_assignments_unique_cohort
  on public.coach_assignments (organization_id, coach_id, cohort_id)
  where cohort_id is not null;
create index if not exists idx_programs_organization_id on public.programs (organization_id);
create index if not exists idx_content_items_organization_id on public.content_items (organization_id);
create index if not exists idx_content_items_module_id on public.content_items (module_id);
create index if not exists idx_quizzes_organization_id on public.quizzes (organization_id);
create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts (user_id);
create index if not exists idx_submissions_user_id on public.submissions (user_id);
create index if not exists idx_notifications_recipient_id on public.notifications (recipient_id, read_at);
create index if not exists idx_coaching_sessions_coach_id on public.coaching_sessions (coach_id, starts_at);
create index if not exists idx_coaching_sessions_coachee_id on public.coaching_sessions (coachee_id, starts_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_notification_preferences_set_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_updated_at();

create trigger organization_settings_set_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

create trigger cohorts_set_updated_at
before update on public.cohorts
for each row execute function public.set_updated_at();

create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger program_modules_set_updated_at
before update on public.program_modules
for each row execute function public.set_updated_at();

create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create trigger quizzes_set_updated_at
before update on public.quizzes
for each row execute function public.set_updated_at();

create trigger coaching_sessions_set_updated_at
before update on public.coaching_sessions
for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = target_organization
      and status = 'active'
  );
$$;

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
    where organization_id = target_organization
      and user_id = auth.uid()
      and role = expected_role
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.user_roles enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.coach_assignments enable row level security;
alter table public.programs enable row level security;
alter table public.program_modules enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.content_items enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_question_choices enable row level security;
alter table public.learning_assignments enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_reviews enable row level security;
alter table public.coaching_sessions enable row level security;
alter table public.coaching_notes enable row level security;
alter table public.notifications enable row level security;

create policy "organization members can read organizations"
on public.organizations
for select
using (public.is_org_member(id));

create policy "organization members can read settings"
on public.organization_settings
for select
using (public.is_org_member(organization_id));

create policy "admins can manage settings"
on public.organization_settings
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

create policy "users can read own profile or staff can read org profiles"
on public.profiles
for select
using (
  auth.uid() = id
  or public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
);

create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "admins can manage profiles"
on public.profiles
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

create policy "users can read own notification preferences"
on public.user_notification_preferences
for select
using (
  auth.uid() = user_id
  or public.has_org_role(organization_id, 'admin')
);

create policy "users can manage own notification preferences"
on public.user_notification_preferences
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.is_org_member(organization_id)
);

create policy "users can read their own roles and admins can read all roles"
on public.user_roles
for select
using (
  auth.uid() = user_id
  or public.has_org_role(organization_id, 'admin')
);

create policy "admins can manage roles"
on public.user_roles
for all
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

create policy "org members can read cohorts"
on public.cohorts
for select
using (public.is_org_member(organization_id));

create policy "staff can manage cohorts"
on public.cohorts
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

create policy "org members can read cohort members"
on public.cohort_members
for select
using (
  exists (
    select 1
    from public.cohorts
    where id = cohort_id
      and public.is_org_member(organization_id)
  )
);

create policy "staff can manage cohort members"
on public.cohort_members
for all
using (
  exists (
    select 1
    from public.cohorts
    where id = cohort_id
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
    from public.cohorts
    where id = cohort_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

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

create policy "org members can read programs"
on public.programs
for select
using (public.is_org_member(organization_id));

create policy "staff can manage programs"
on public.programs
for all
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
)
with check (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
);

create policy "org members can read modules"
on public.program_modules
for select
using (
  exists (
    select 1
    from public.programs
    where id = program_id
      and public.is_org_member(organization_id)
  )
);

create policy "staff can manage modules"
on public.program_modules
for all
using (
  exists (
    select 1
    from public.programs
    where id = program_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
      )
  )
)
with check (
  exists (
    select 1
    from public.programs
    where id = program_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
      )
  )
);

create policy "org members can read enrollments"
on public.program_enrollments
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.programs
    where id = program_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

create policy "staff can manage enrollments"
on public.program_enrollments
for all
using (
  exists (
    select 1
    from public.programs
    where id = program_id
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
    from public.programs
    where id = program_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

create policy "org members can read content"
on public.content_items
for select
using (public.is_org_member(organization_id));

create policy "staff can manage content"
on public.content_items
for all
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
)
with check (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
);

create policy "org members can read quizzes"
on public.quizzes
for select
using (public.is_org_member(organization_id));

create policy "staff can manage quizzes"
on public.quizzes
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

create policy "org members can read quiz questions"
on public.quiz_questions
for select
using (
  exists (
    select 1
    from public.quizzes
    where id = quiz_id
      and public.is_org_member(organization_id)
  )
);

create policy "staff can manage quiz questions"
on public.quiz_questions
for all
using (
  exists (
    select 1
    from public.quizzes
    where id = quiz_id
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
    from public.quizzes
    where id = quiz_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

create policy "org members can read quiz choices"
on public.quiz_question_choices
for select
using (
  exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    where qq.id = question_id
      and public.is_org_member(q.organization_id)
  )
);

create policy "staff can manage quiz choices"
on public.quiz_question_choices
for all
using (
  exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    where qq.id = question_id
      and (
        public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.has_org_role(q.organization_id, 'coach')
      )
  )
)
with check (
  exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    where qq.id = question_id
      and (
        public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.has_org_role(q.organization_id, 'coach')
      )
  )
);

create policy "org members can read assignments"
on public.learning_assignments
for select
using (public.is_org_member(organization_id));

create policy "staff can manage assignments"
on public.learning_assignments
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

create policy "users can read own attempts and staff can read all"
on public.quiz_attempts
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.quizzes
    where id = quiz_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

create policy "users can create own attempts"
on public.quiz_attempts
for insert
with check (auth.uid() = user_id);

create policy "users can update own attempts or staff can grade"
on public.quiz_attempts
for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.quizzes
    where id = quiz_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.quizzes
    where id = quiz_id
      and (
        public.has_org_role(organization_id, 'admin')
        or public.has_org_role(organization_id, 'professor')
        or public.has_org_role(organization_id, 'coach')
      )
  )
);

create policy "users and staff can read attempt answers"
on public.quiz_attempt_answers
for select
using (
  exists (
    select 1
    from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    where qa.id = attempt_id
      and (
        auth.uid() = qa.user_id
        or public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.has_org_role(q.organization_id, 'coach')
      )
  )
);

create policy "users can manage own attempt answers"
on public.quiz_attempt_answers
for all
using (
  exists (
    select 1
    from public.quiz_attempts
    where id = attempt_id
      and auth.uid() = user_id
  )
)
with check (
  exists (
    select 1
    from public.quiz_attempts
    where id = attempt_id
      and auth.uid() = user_id
  )
);

create policy "users can read own submissions and staff can read all"
on public.submissions
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_id
      and (
        public.has_org_role(ci.organization_id, 'admin')
        or public.has_org_role(ci.organization_id, 'professor')
        or public.has_org_role(ci.organization_id, 'coach')
      )
  )
);

create policy "users can create and update own submissions"
on public.submissions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "submission owner and staff can review feedback"
on public.submission_reviews
for select
using (
  exists (
    select 1
    from public.submissions s
    join public.content_items ci on ci.id = s.content_item_id
    where s.id = submission_id
      and (
        auth.uid() = s.user_id
        or
        public.has_org_role(ci.organization_id, 'admin')
        or public.has_org_role(ci.organization_id, 'professor')
        or public.has_org_role(ci.organization_id, 'coach')
      )
  )
);

create policy "staff can create submission reviews"
on public.submission_reviews
for insert
with check (
  exists (
    select 1
    from public.submissions s
    join public.content_items ci on ci.id = s.content_item_id
    where s.id = submission_id
      and (
        public.has_org_role(ci.organization_id, 'admin')
        or public.has_org_role(ci.organization_id, 'professor')
        or public.has_org_role(ci.organization_id, 'coach')
      )
  )
);

create policy "session participants and admins can read coaching sessions"
on public.coaching_sessions
for select
using (
  auth.uid() = coach_id
  or auth.uid() = coachee_id
  or public.has_org_role(organization_id, 'admin')
);

create policy "coaches and admins can manage sessions"
on public.coaching_sessions
for all
using (
  auth.uid() = coach_id
  or public.has_org_role(organization_id, 'admin')
)
with check (
  auth.uid() = coach_id
  or public.has_org_role(organization_id, 'admin')
);

create policy "session participants can read notes"
on public.coaching_notes
for select
using (
  exists (
    select 1
    from public.coaching_sessions cs
    where cs.id = session_id
      and (
        auth.uid() = cs.coach_id
        or auth.uid() = cs.coachee_id
        or public.has_org_role(cs.organization_id, 'admin')
      )
  )
);

create policy "coach owners can create notes"
on public.coaching_notes
for insert
with check (
  exists (
    select 1
    from public.coaching_sessions cs
    where cs.id = session_id
      and (
        auth.uid() = cs.coach_id
        or public.has_org_role(cs.organization_id, 'admin')
      )
  )
);

create policy "users can read own notifications"
on public.notifications
for select
using (auth.uid() = recipient_id);

create policy "users can mark own notifications as read"
on public.notifications
for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create policy "staff can create notifications"
on public.notifications
for insert
with check (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
);

comment on table public.learning_assignments is
'Table pivot pour gérer deadlines et publications ciblées sur une cohorte ou un coaché.';

comment on table public.coaching_notes is
'Journal structuré des séances de coaching: synthèse, blocages, prochaines actions.';
