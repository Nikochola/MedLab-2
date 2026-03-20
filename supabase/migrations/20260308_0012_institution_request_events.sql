create table if not exists public.institution_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.institution_access_requests(id) on delete cascade,
  event_type text not null,
  actor_email text,
  channel text not null,
  subject text,
  body_excerpt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_institution_request_events_request_created
  on public.institution_request_events (request_id, created_at desc);
