-- Run once in the Supabase SQL Editor for the project this repository should
-- keep active. The scheduled job updates one fixed row, so the table does not
-- grow over time.

create table if not exists public.project_keepalive (
  id smallint primary key check (id = 1),
  last_seen_at timestamptz not null
);

alter table public.project_keepalive enable row level security;

revoke all on table public.project_keepalive from anon, authenticated;

comment on table public.project_keepalive is
  'Single-row heartbeat updated by the scheduled GitHub Actions keep-alive job.';
