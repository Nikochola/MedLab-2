alter table public.institutions
  add column if not exists subdomain_enabled boolean not null default false;

create table if not exists public.institution_integrations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  provider text not null check (provider in ('CANVAS', 'MOODLE')),
  status text not null default 'CONNECTED' check (status in ('CONNECTED', 'ERROR', 'DISABLED')),
  base_url text not null,
  external_course_id text not null,
  encrypted_access_token text not null,
  last_synced_at timestamptz,
  last_sync_summary jsonb not null default '{}'::jsonb,
  last_error text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, provider, course_id)
);

create table if not exists public.institution_integration_syncs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  integration_id uuid not null references public.institution_integrations(id) on delete cascade,
  status text not null check (status in ('SUCCESS', 'ERROR')),
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  initiated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.institution_success_profiles (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  account_manager_name text,
  account_manager_email text,
  account_manager_calendar_url text,
  review_cadence text not null default 'QUARTERLY' check (review_cadence in ('QUARTERLY', 'BIANNUAL', 'ANNUAL')),
  next_review_at timestamptz,
  review_agenda text,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_institution_integrations_institution
  on public.institution_integrations(institution_id, status);
create index if not exists idx_institution_integration_syncs_integration
  on public.institution_integration_syncs(integration_id, created_at desc);

alter table public.institution_integrations enable row level security;
alter table public.institution_integration_syncs enable row level security;
alter table public.institution_success_profiles enable row level security;

-- Integration credentials and success-management notes are server-only. No
-- browser policies are created; authenticated access flows through role-checked
-- server actions using the service role.
