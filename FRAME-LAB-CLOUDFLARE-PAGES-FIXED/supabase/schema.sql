-- FRAME LAB: безопасное хранилище заявок и отзывов для Supabase.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  client text not null, contact text not null, service text not null, business text, goal text,
  deadline text, materials text, reference text, details text, budget text, brief text,
  status text not null default 'new' check (status in ('new','in_progress','done'))
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  author text not null, project text, rating integer not null check (rating between 1 and 5),
  body text not null, status text not null default 'pending' check (status in ('pending','approved','rejected'))
);
alter table public.admin_users enable row level security;
alter table public.requests enable row level security;
alter table public.reviews enable row level security;
-- Public visitors may submit requests; only allowlisted admin users can read/manage them.
drop policy if exists "public can submit requests" on public.requests;
create policy "public can submit requests" on public.requests for insert to anon, authenticated with check (status='new');
drop policy if exists "admins manage requests" on public.requests;
create policy "admins manage requests" on public.requests for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
-- Public visitors can submit pending reviews and read only approved reviews.
drop policy if exists "public can submit reviews" on public.reviews;
create policy "public can submit reviews" on public.reviews for insert to anon, authenticated with check (status='pending');
drop policy if exists "public can read approved reviews" on public.reviews;
create policy "public can read approved reviews" on public.reviews for select to anon, authenticated using (status='approved');
drop policy if exists "admins manage reviews" on public.reviews;
create policy "admins manage reviews" on public.reviews for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
-- Admin allowlist is intentionally not readable from the public website.
drop policy if exists "admins read own allowlist row" on public.admin_users;
create policy "admins read own allowlist row" on public.admin_users for select to authenticated using (user_id=auth.uid());


-- Расширение кабинета: заметки, история событий и файлы заказов.
create table if not exists public.request_notes (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references auth.users(id), body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.request_activity (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade,
  actor_id uuid references auth.users(id), event_type text not null, description text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references auth.users(id), direction text not null check(direction in ('outgoing','internal')),
  body text not null check(char_length(body) between 1 and 10000), created_at timestamptz not null default now()
);
create table if not exists public.request_files (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id), storage_path text not null, file_name text not null,
  content_type text, size_bytes bigint, created_at timestamptz not null default now()
);
alter table public.request_notes enable row level security;
alter table public.request_activity enable row level security;
alter table public.request_messages enable row level security;
alter table public.request_files enable row level security;
drop policy if exists "admins manage request notes" on public.request_notes;
create policy "admins manage request notes" on public.request_notes for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins manage request activity" on public.request_activity;
create policy "admins manage request activity" on public.request_activity for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins manage request messages" on public.request_messages;
create policy "admins manage request messages" on public.request_messages for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins manage request files" on public.request_files;
create policy "admins manage request files" on public.request_files for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
-- Private bucket: файлы видны только администратору.
insert into storage.buckets(id,name,public,file_size_limit) values ('client-files','client-files',false,20971520) on conflict(id) do nothing;
create policy "admins upload client files" on storage.objects for insert to authenticated with check (bucket_id='client-files' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "admins read client files" on storage.objects for select to authenticated using (bucket_id='client-files' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "admins delete client files" on storage.objects for delete to authenticated using (bucket_id='client-files' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
