insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-files', 'course-files', false, 104857600, array['application/pdf']),
  (
    'submission-files',
    'submission-files',
    false,
    26214400,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/png',
      'image/jpeg'
    ]
  )
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_coach_access_coachee(target_organization uuid, target_coachee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_org_role(target_organization, 'coach')
    and exists (
      select 1
      from public.coach_assignments ca
      where ca.organization_id = target_organization
        and ca.coach_id = auth.uid()
        and (
          ca.coachee_id = target_coachee
          or (
            ca.cohort_id is not null
            and exists (
              select 1
              from public.cohort_members cm
              where cm.cohort_id = ca.cohort_id
                and cm.user_id = target_coachee
            )
          )
        )
    );
$$;

drop policy if exists "org members can read content" on public.content_items;
create policy "staff and members can read published content"
on public.content_items
for select
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
  or (
    status = 'published'
    and public.is_org_member(organization_id)
  )
);

drop policy if exists "org members can read quizzes" on public.quizzes;
create policy "staff and members can read published quizzes"
on public.quizzes
for select
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or public.has_org_role(organization_id, 'coach')
  or (
    status = 'published'
    and public.is_org_member(organization_id)
  )
);

drop policy if exists "org members can read quiz questions" on public.quiz_questions;
create policy "staff and members can read published quiz questions"
on public.quiz_questions
for select
using (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and (
        public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.has_org_role(q.organization_id, 'coach')
        or (
          q.status = 'published'
          and public.is_org_member(q.organization_id)
        )
      )
  )
);

drop policy if exists "org members can read quiz choices" on public.quiz_question_choices;

drop policy if exists "org members can read assignments" on public.learning_assignments;
create policy "staff and assigned learners can read assignments"
on public.learning_assignments
for select
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or (
    assigned_user_id is not null
    and public.can_coach_access_coachee(organization_id, assigned_user_id)
  )
  or (
    cohort_id is not null
    and exists (
      select 1
      from public.coach_assignments ca
      where ca.organization_id = learning_assignments.organization_id
        and ca.coach_id = auth.uid()
        and ca.cohort_id = learning_assignments.cohort_id
    )
  )
  or assigned_user_id = auth.uid()
  or (
    cohort_id is not null
    and exists (
      select 1
      from public.cohort_members cm
      where cm.cohort_id = learning_assignments.cohort_id
        and cm.user_id = auth.uid()
    )
  )
);

drop policy if exists "staff can manage assignments" on public.learning_assignments;
create policy "admin professor and scoped coaches can manage assignments"
on public.learning_assignments
for all
using (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or (
    assigned_user_id is not null
    and public.can_coach_access_coachee(organization_id, assigned_user_id)
  )
  or (
    cohort_id is not null
    and exists (
      select 1
      from public.coach_assignments ca
      where ca.organization_id = learning_assignments.organization_id
        and ca.coach_id = auth.uid()
        and ca.cohort_id = learning_assignments.cohort_id
    )
  )
)
with check (
  public.has_org_role(organization_id, 'admin')
  or public.has_org_role(organization_id, 'professor')
  or (
    assigned_user_id is not null
    and public.can_coach_access_coachee(organization_id, assigned_user_id)
  )
  or (
    cohort_id is not null
    and exists (
      select 1
      from public.coach_assignments ca
      where ca.organization_id = learning_assignments.organization_id
        and ca.coach_id = auth.uid()
        and ca.cohort_id = learning_assignments.cohort_id
    )
  )
);

drop policy if exists "users can read own attempts and staff can read all" on public.quiz_attempts;
create policy "users and assigned staff can read attempts"
on public.quiz_attempts
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.quizzes q
    where q.id = quiz_attempts.quiz_id
      and (
        public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.can_coach_access_coachee(q.organization_id, quiz_attempts.user_id)
      )
  )
);

drop policy if exists "users can update own attempts or staff can grade" on public.quiz_attempts;
create policy "users and assigned staff can update attempts"
on public.quiz_attempts
for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.quizzes q
    where q.id = quiz_attempts.quiz_id
      and (
        public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.can_coach_access_coachee(q.organization_id, quiz_attempts.user_id)
      )
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.quizzes q
    where q.id = quiz_attempts.quiz_id
      and (
        public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.can_coach_access_coachee(q.organization_id, quiz_attempts.user_id)
      )
  )
);

drop policy if exists "users and staff can read attempt answers" on public.quiz_attempt_answers;
create policy "users and assigned staff can read attempt answers"
on public.quiz_attempt_answers
for select
using (
  exists (
    select 1
    from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    where qa.id = quiz_attempt_answers.attempt_id
      and (
        auth.uid() = qa.user_id
        or public.has_org_role(q.organization_id, 'admin')
        or public.has_org_role(q.organization_id, 'professor')
        or public.can_coach_access_coachee(q.organization_id, qa.user_id)
      )
  )
);

drop policy if exists "users can read own submissions and staff can read all" on public.submissions;
create policy "users and assigned staff can read submissions"
on public.submissions
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.content_items ci
    where ci.id = submissions.content_item_id
      and (
        public.has_org_role(ci.organization_id, 'admin')
        or public.has_org_role(ci.organization_id, 'professor')
        or public.can_coach_access_coachee(ci.organization_id, submissions.user_id)
      )
  )
);

drop policy if exists "submission owner and staff can review feedback" on public.submission_reviews;
create policy "submission owner and assigned staff can review feedback"
on public.submission_reviews
for select
using (
  exists (
    select 1
    from public.submissions s
    join public.content_items ci on ci.id = s.content_item_id
    where s.id = submission_reviews.submission_id
      and (
        auth.uid() = s.user_id
        or public.has_org_role(ci.organization_id, 'admin')
        or public.has_org_role(ci.organization_id, 'professor')
        or public.can_coach_access_coachee(ci.organization_id, s.user_id)
      )
  )
);

drop policy if exists "staff can create submission reviews" on public.submission_reviews;
create policy "assigned staff can create submission reviews"
on public.submission_reviews
for insert
with check (
  exists (
    select 1
    from public.submissions s
    join public.content_items ci on ci.id = s.content_item_id
    where s.id = submission_reviews.submission_id
      and (
        public.has_org_role(ci.organization_id, 'admin')
        or public.has_org_role(ci.organization_id, 'professor')
        or public.can_coach_access_coachee(ci.organization_id, s.user_id)
      )
  )
);

drop policy if exists "participants can create coach conversations" on public.coach_conversations;
create policy "assigned participants can create coach conversations"
on public.coach_conversations
for insert
with check (
  (
    auth.uid() = coach_id
    or auth.uid() = coachee_id
    or public.has_org_role(organization_id, 'admin')
  )
  and exists (
    select 1
    from public.user_roles
    where organization_id = coach_conversations.organization_id
      and user_id = coach_conversations.coach_id
      and role = 'coach'
  )
  and exists (
    select 1
    from public.user_roles
    where organization_id = coach_conversations.organization_id
      and user_id = coach_conversations.coachee_id
      and role = 'coachee'
  )
  and (
    public.has_org_role(organization_id, 'admin')
    or public.can_coach_access_coachee(organization_id, coachee_id)
    or (
      auth.uid() = coachee_id
      and exists (
        select 1
        from public.coach_assignments ca
        where ca.organization_id = coach_conversations.organization_id
          and ca.coach_id = coach_conversations.coach_id
          and (
            ca.coachee_id = coach_conversations.coachee_id
            or (
              ca.cohort_id is not null
              and exists (
                select 1
                from public.cohort_members cm
                where cm.cohort_id = ca.cohort_id
                  and cm.user_id = coach_conversations.coachee_id
              )
            )
          )
      )
    )
  )
);
