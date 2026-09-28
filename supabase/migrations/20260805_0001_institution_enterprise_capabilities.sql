alter table public.institution_success_profiles
  add column if not exists priority_support_email text,
  add column if not exists sla_response_minutes integer check (sla_response_minutes is null or sla_response_minutes > 0);

create table if not exists public.institution_branding (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  enabled boolean not null default false,
  product_name text,
  logo_url text,
  favicon_url text,
  primary_color text not null default '#0066FF' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#EEF3FF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  hide_medlab_branding boolean not null default false,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_cases (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  modality text not null check (modality in ('ECG', 'X-Ray', 'Clinical')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  duration_min integer not null default 15 check (duration_min between 1 and 180),
  patient_summary text not null,
  clinical_prompt text not null,
  correct_diagnosis text not null,
  teaching_points jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  version integer not null default 1,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_api_keys (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['analytics:read']::text[],
  daily_limit integer not null default 10000 check (daily_limit between 1 and 1000000),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.institution_api_usage_daily (
  api_key_id uuid not null references public.institution_api_keys(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  primary key (api_key_id, usage_date)
);

create table if not exists public.institution_audit_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_type text not null check (actor_type in ('USER', 'API_KEY', 'SYSTEM')),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_institution_cases_status on public.institution_cases(institution_id, status, updated_at desc);
create index if not exists idx_institution_api_keys_institution on public.institution_api_keys(institution_id, revoked_at);
create index if not exists idx_institution_audit_events_created on public.institution_audit_events(institution_id, created_at desc);

alter table public.institution_branding enable row level security;
alter table public.institution_cases enable row level security;
alter table public.institution_api_keys enable row level security;
alter table public.institution_api_usage_daily enable row level security;
alter table public.institution_audit_events enable row level security;

create or replace function public.consume_institution_api_quota(p_api_key_id uuid)
returns table(request_count integer, daily_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  select k.daily_limit into v_limit
  from public.institution_api_keys k
  where k.id = p_api_key_id
    and k.revoked_at is null
    and (k.expires_at is null or k.expires_at > now());

  if v_limit is null then return; end if;

  return query
  insert into public.institution_api_usage_daily(api_key_id, usage_date, request_count)
  values (p_api_key_id, current_date, 1)
  on conflict (api_key_id, usage_date) do update
    set request_count = institution_api_usage_daily.request_count + 1
    where institution_api_usage_daily.request_count < v_limit
  returning institution_api_usage_daily.request_count, v_limit;

  update public.institution_api_keys set last_used_at = now() where id = p_api_key_id;
end;
$$;

revoke all on function public.consume_institution_api_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_institution_api_quota(uuid) to service_role;

-- All Enterprise control tables remain server-only. Role-checked server actions
-- and API authentication use the service role; no browser policies are granted.
