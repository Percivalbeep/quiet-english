-- Extend only the allowed course IDs. Keep all records, roles and RLS unchanged.
begin;
alter table public.qe_events drop constraint if exists qe_events_lesson_id_check;
alter table public.qe_events add constraint qe_events_lesson_id_check
 check (lesson_id ~ '^day-(0[1-9]|[1-3][0-9]|4[0-8])$');
commit;
