alter table public.profiles
  add column if not exists job_title text,
  add column if not exists phone text;

alter table public.institutions
  add column if not exists institution_type text,
  add column if not exists country_region text,
  add column if not exists estimated_students integer,
  add column if not exists billing_plan text,
  add column if not exists billing_status text default 'pending',
  add column if not exists billing_code text,
  add column if not exists content_library text default 'BOTH',
  add column if not exists student_access_policy text default 'INVITE_ONLY',
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists pending_team_invites jsonb not null default '[]'::jsonb;
