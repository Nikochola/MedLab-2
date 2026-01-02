-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('teacher','student','platform_admin')),
  deactivated boolean default false,
  classroom_id uuid,
  created_at timestamptz default now()
);

-- Classrooms
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  teacher_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- Student Activities
create table if not exists student_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  classroom_id uuid references classrooms(id) on delete set null,
  activity_type text not null,
  data jsonb default '{}'::jsonb,
  timestamp timestamptz default now()
);

-- Student Progress (aggregated snapshots)
create table if not exists student_progress (
  student_id uuid primary key references users(id) on delete cascade,
  student_name text,
  classroom_id uuid references classrooms(id) on delete set null,
  simulations_completed int default 0,
  cases_completed int default 0,
  total_time_spent int default 0,
  steps_attempted jsonb default '{}'::jsonb,
  last_activity timestamptz default now()
);

-- Case Assessments
create table if not exists case_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id) on delete cascade,
  student_name text,
  classroom_id uuid references classrooms(id) on delete set null,
  teacher_id uuid references users(id) on delete set null,
  submitted_at timestamptz default now(),
  patient_case jsonb,
  ecg_findings jsonb,
  assessment jsonb,
  ai_feedback jsonb
);

-- RLS
alter table users enable row level security;
alter table classrooms enable row level security;
alter table student_activities enable row level security;
alter table student_progress enable row level security;
alter table case_assessments enable row level security;

-- Policies (anon key can read/write basic data; tighten as needed)
create policy "Allow anon read" on users for select using (true);
create policy "Allow anon insert" on users for insert with check (true);
create policy "Allow anon update own" on users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Platform admin manage users" on users for update
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (true);

create policy "Allow anon read classrooms" on classrooms for select using (true);
create policy "Allow anon insert classrooms" on classrooms for insert with check (true);

create policy "Allow anon read activities" on student_activities for select using (true);
create policy "Allow anon insert activities" on student_activities for insert with check (true);

create policy "Allow anon read progress" on student_progress for select using (true);
create policy "Allow anon upsert progress" on student_progress for insert with check (true);
create policy "Allow anon update progress" on student_progress for update using (true) with check (true);

create policy "Allow anon read assessments" on case_assessments for select using (true);
create policy "Allow anon insert assessments" on case_assessments for insert with check (true);

-- Helper functions to avoid recursive org_members checks
create or replace function is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id
      and user_id = auth.uid()
      and role = 'org_admin'
  );
$$;

-- Organizations (multi-tenant)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'trial' check (status in ('trial','active','past_due','suspended')),
  seat_limit int,
  owner_user_id uuid references users(id) on delete set null,
  domain text,
  subdomain text,
  logo_url text,
  contact_email text,
  signup_policy text default 'invite_only' check (signup_policy in ('invite_only','domain_allow')),
  allowed_domain text,
  created_at timestamptz default now()
);

create table if not exists org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('org_admin','teacher','student')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  term text,
  created_at timestamptz default now()
);

create table if not exists cohort_members (
  cohort_id uuid not null references cohorts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (cohort_id, user_id)
);

create table if not exists entitlements (
  org_id uuid primary key references organizations(id) on delete cascade,
  ecg_practice boolean default true,
  cases boolean default true,
  analytics boolean default false,
  ai_feedback boolean default true,
  attempts_per_day int default 0,
  beta_access boolean default false,
  cohorts_enabled boolean default true,
  seats int,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  status text not null check (status in ('trialing','active','past_due','canceled','lifetime')),
  plan text,
  seat_limit int,
  is_lifetime boolean default false,
  comp_until timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz default now()
);

create table if not exists platform_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  actor_role text,
  org_id uuid references organizations(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Invitations (org-admin controlled)
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  cohort_id uuid references cohorts(id) on delete set null,
  teacher_id uuid references users(id) on delete set null,
  email text not null,
   full_name text,
  role text not null default 'student' check (role in ('student','teacher')),
  token text unique not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- RLS for multi-tenant tables
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table cohorts enable row level security;
alter table cohort_members enable row level security;
alter table entitlements enable row level security;
alter table subscriptions enable row level security;
alter table platform_audit enable row level security;
alter table invites enable row level security;

-- Helper predicates rely on users.role

-- organizations policies
create policy "platform admins manage orgs" on organizations
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "members read own org" on organizations
  for select
  using (
    exists (
      select 1 from org_members m
      where m.org_id = organizations.id
      and m.user_id = auth.uid()
    )
  );

-- org_members policies
create policy "platform admins manage org members" on org_members
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "org admins manage members" on org_members
  for insert
  with check (is_org_admin(org_members.org_id));

create policy "org admins update/delete members" on org_members
  for update
  using (is_org_admin(org_members.org_id))
  with check (is_org_admin(org_members.org_id));

create policy "org members can see roster" on org_members
  for select
  using (is_org_member(org_members.org_id) or exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

-- cohorts policies
create policy "platform admins manage cohorts" on cohorts
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "org admins manage cohorts" on cohorts
  for insert
  with check (
    exists (
      select 1 from org_members m
      where m.org_id = cohorts.org_id
      and m.user_id = auth.uid()
      and m.role = 'org_admin'
    )
  );

create policy "org admins update/delete cohorts" on cohorts
  for update
  using (
    exists (
      select 1 from org_members m
      where m.org_id = cohorts.org_id
      and m.user_id = auth.uid()
      and m.role = 'org_admin'
    )
  )
  with check (
    exists (
      select 1 from org_members m
      where m.org_id = cohorts.org_id
      and m.user_id = auth.uid()
      and m.role = 'org_admin'
    )
  );

create policy "org members view cohorts" on cohorts
  for select
  using (
    exists (
      select 1 from org_members m
      where m.org_id = cohorts.org_id
      and m.user_id = auth.uid()
    ) or exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin')
  );

-- cohort_members policies
create policy "platform admins manage cohort members" on cohort_members
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "org admins/teachers manage cohort roster" on cohort_members
  for insert
  with check (
    exists (
      select 1 from cohorts c
      join org_members m on m.org_id = c.org_id
      where c.id = cohort_members.cohort_id
      and m.user_id = auth.uid()
      and m.role in ('org_admin','teacher')
    )
  );

create policy "org admins/teachers remove cohort roster" on cohort_members
  for delete
  using (
    exists (
      select 1 from cohorts c
      join org_members m on m.org_id = c.org_id
      where c.id = cohort_members.cohort_id
      and m.user_id = auth.uid()
      and m.role in ('org_admin','teacher')
    )
  );

create policy "students see their cohorts" on cohort_members
  for select
  using (
    cohort_members.user_id = auth.uid()
    or exists (
      select 1 from cohorts c
      join org_members m on m.org_id = c.org_id
      where c.id = cohort_members.cohort_id
      and m.user_id = auth.uid()
    )
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin')
  );

create policy "students manage own cohort membership" on cohort_members
  for insert
  with check (
    cohort_members.user_id = auth.uid()
    and exists (
      select 1 from cohorts c
      join org_members m on m.org_id = c.org_id
      where c.id = cohort_members.cohort_id
      and m.user_id = auth.uid()
      and m.role = 'student'
    )
  );

create policy "students leave cohorts" on cohort_members
  for delete
  using (
    cohort_members.user_id = auth.uid()
    and exists (
      select 1 from cohorts c
      join org_members m on m.org_id = c.org_id
      where c.id = cohort_members.cohort_id
      and m.user_id = auth.uid()
    )
  );

-- entitlements policies
create policy "platform admins manage entitlements" on entitlements
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "org members read entitlements" on entitlements
  for select
  using (
    exists (
      select 1 from org_members m
      where m.org_id = entitlements.org_id
      and m.user_id = auth.uid()
    ) or exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin')
  );

create policy "org admins manage entitlements" on entitlements
  for all
  using (is_org_admin(entitlements.org_id))
  with check (is_org_admin(entitlements.org_id));

-- subscriptions policies
create policy "platform admins manage subscriptions" on subscriptions
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

-- platform_audit policies
create policy "platform admins read audit" on platform_audit
  for select
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "platform admins insert audit" on platform_audit
  for insert
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin'));

create policy "org admins read audit" on platform_audit
  for select
  using (is_org_admin(platform_audit.org_id));

-- invites policies
create policy "org admins manage invites" on invites
  for all
  using (is_org_admin(invites.org_id))
  with check (is_org_admin(invites.org_id));

create policy "org members read org subscriptions" on subscriptions
  for select
  using (
    (subscriptions.org_id is not null and exists (
      select 1 from org_members m where m.org_id = subscriptions.org_id and m.user_id = auth.uid()
    ))
    or subscriptions.user_id = auth.uid()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'platform_admin')
  );

create policy "users manage own subscription" on subscriptions
  for insert
  with check (subscriptions.user_id = auth.uid() and subscriptions.org_id is null);

create policy "users update own subscription" on subscriptions
  for update
  using (subscriptions.user_id = auth.uid() and subscriptions.org_id is null)
  with check (subscriptions.user_id = auth.uid() and subscriptions.org_id is null);
