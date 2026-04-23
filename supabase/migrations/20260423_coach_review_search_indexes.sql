create extension if not exists pg_trgm;

create index if not exists idx_quizzes_review_search_trgm
on public.quizzes
using gin ((coalesce(title, '') || ' ' || coalesce(description, '')) gin_trgm_ops);

create index if not exists idx_content_items_review_search_trgm
on public.content_items
using gin (
  (
    coalesce(title, '') || ' ' ||
    coalesce(summary, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(subcategory, '')
  ) gin_trgm_ops
);

create index if not exists idx_submissions_review_search_trgm
on public.submissions
using gin ((coalesce(title, '') || ' ' || coalesce(notes, '')) gin_trgm_ops);

create index if not exists idx_quiz_attempt_answers_text_trgm
on public.quiz_attempt_answers
using gin (answer_text gin_trgm_ops);
