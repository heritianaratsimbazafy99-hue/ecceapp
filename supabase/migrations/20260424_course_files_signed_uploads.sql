insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-files', 'course-files', false, 104857600, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 104857600,
    allowed_mime_types = array['application/pdf'];
