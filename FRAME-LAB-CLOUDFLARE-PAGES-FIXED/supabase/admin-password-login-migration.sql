-- Apply AFTER supabase/schema.sql when switching admin login to the Cloudflare Worker.
-- Admin activity actors are identified by ADMIN_USER_ID (a UUID stored as metadata),
-- not by a Supabase Auth account. Public site tables and their insert policies stay unchanged.
alter table public.request_notes drop constraint if exists request_notes_author_id_fkey;
alter table public.request_messages drop constraint if exists request_messages_author_id_fkey;
alter table public.request_files drop constraint if exists request_files_uploaded_by_fkey;
-- Allow a generated server-side actor UUID for private audit events.
