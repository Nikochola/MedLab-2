create table if not exists public.institution_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null,
  institution_name text not null,
  institution_type text not null,
  estimated_students integer not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_by_email text,
  rejection_reason text,
  setup_link_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_institution_access_requests_status_created_at
  on public.institution_access_requests (status, created_at desc);

create table if not exists public.institution_setup_links (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.institution_access_requests(id) on delete cascade,
  full_name text not null,
  work_email text not null,
  institution_name text not null,
  institution_type text not null,
  estimated_students integer,
  token_hash text not null unique,
  expires_at timestamptz not null,
  verification_code_hash text,
  verification_code_sent_at timestamptz,
  email_verified_at timestamptz,
  claimed_at timestamptz,
  claimed_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_institution_setup_links_request_id
  on public.institution_setup_links (request_id, created_at desc);

create index if not exists idx_institution_setup_links_work_email
  on public.institution_setup_links (work_email, expires_at desc);

create table if not exists public.institution_billing_codes (
  code text primary key,
  kind text not null default 'PROMO' check (kind in ('PROMO', 'CONTRACT')),
  allowed_plan text,
  waives_card boolean not null default true,
  is_active boolean not null default true,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.institutions
  add column if not exists access_request_id uuid references public.institution_access_requests(id) on delete set null,
  add column if not exists billing_interval text default 'MONTHLY',
  add column if not exists billing_contact_name text,
  add column if not exists billing_card_brand text,
  add column if not exists billing_card_last4 text;
