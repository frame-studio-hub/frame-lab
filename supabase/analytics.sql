-- FRAME LAB site analytics. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.site_visitors (
  visitor_id uuid primary key,
  ip_address text,
  user_agent text,
  browser text,
  operating_system text,
  device_type text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.site_visitors(visitor_id) on delete cascade,
  page_path text not null,
  referrer text,
  created_at timestamptz not null default now()
);
create table if not exists public.site_daily_uniques (
  day date not null,
  visitor_key text not null,
  primary key(day, visitor_key)
);
create table if not exists public.site_daily_stats (
  day date primary key,
  pageviews bigint not null default 0,
  unique_visitors bigint not null default 0
);
create index if not exists site_visits_created_at_idx on public.site_visits(created_at desc);
create index if not exists site_visits_visitor_idx on public.site_visits(visitor_id);
alter table public.site_visitors enable row level security;
alter table public.site_visits enable row level security;
alter table public.site_daily_uniques enable row level security;
alter table public.site_daily_stats enable row level security;
-- No client-side policies: all reads/writes go through the authenticated Cloudflare Worker.
create or replace function public.aggregate_site_visit() returns trigger language plpgsql security definer set search_path=public as $$
declare inserted_unique integer;
begin
  insert into public.site_daily_stats(day,pageviews,unique_visitors)
  values ((new.created_at at time zone 'UTC')::date,1,0)
  on conflict(day) do update set pageviews=site_daily_stats.pageviews+1;
  insert into public.site_daily_uniques(day,visitor_key)
  values ((new.created_at at time zone 'UTC')::date, encode(digest(new.visitor_id::text || (new.created_at at time zone 'UTC')::date::text,'sha256'),'hex'))
  on conflict do nothing;
  get diagnostics inserted_unique = row_count;
  if inserted_unique=1 then
    update public.site_daily_stats set unique_visitors=unique_visitors+1
    where day=(new.created_at at time zone 'UTC')::date;
  end if;
  return new;
end $$;
drop trigger if exists site_visit_aggregate on public.site_visits;
create trigger site_visit_aggregate after insert on public.site_visits for each row execute function public.aggregate_site_visit();
create or replace function public.purge_site_analytics() returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.site_visits where created_at < now()-interval '30 days';
  update public.site_visitors set ip_address=null,user_agent=null,browser=null,operating_system=null,device_type=null
    where first_seen < now()-interval '30 days' and (ip_address is not null or user_agent is not null);
  delete from public.site_daily_uniques where day < (now() at time zone 'UTC')::date - 30;
  delete from public.site_visitors where last_seen < now()-interval '180 days';
end $$;

-- Schedule the purge daily when the Supabase project has pg_cron available.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('frame-lab-analytics-retention','17 3 * * *','select public.purge_site_analytics()');
exception when others then
  raise notice 'pg_cron is not available; schedule public.purge_site_analytics() in Supabase Cron instead.';
end $$;
