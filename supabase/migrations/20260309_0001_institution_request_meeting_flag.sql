alter table public.institution_access_requests
  add column if not exists wants_meeting boolean not null default false;
