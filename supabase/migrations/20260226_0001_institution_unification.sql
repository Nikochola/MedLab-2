-- MedLab unified institution migration
-- Creates new institution/course model, migrates legacy org/cohort data,
-- introduces Better Auth support tables, and applies safe RLS defaults.

create extension if not exists pgcrypto;

-- Hash helper that works whether pgcrypto is installed in `public` or `extensions`.
create or replace function public.medlab_token_hash(input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text;
begin
  if input is null then
    return null;
  end if;

  if to_regprocedure('extensions.digest(text,text)') is not null then
    execute 'select encode(extensions.digest($1, ''sha256''), ''hex'')'
      into hashed
      using input;
    return hashed;
  end if;

  if to_regprocedure('public.digest(text,text)') is not null then
    execute 'select encode(public.digest($1, ''sha256''), ''hex'')'
      into hashed
      using input;
    return hashed;
  end if;

  -- Fallback for environments without digest(); old links will be invalidated.
  return md5(input);
end;
$$;

-- Better Auth core tables (separate from public.users profile table)
create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id uuid not null references public.auth_users(id) on delete cascade
);

create table if not exists public.auth_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  provider_id text not null,
  user_id uuid not null references public.auth_users(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, account_id)
);

create table if not exists public.auth_verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id on public.auth_sessions(user_id);
create index if not exists idx_auth_accounts_user_id on public.auth_accounts(user_id);
create index if not exists idx_auth_verifications_identifier on public.auth_verifications(identifier);

-- Ensure users profile table exists for app-level profile records.
create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Normalize existing users profile table to target app profile shape.
alter table if exists public.users
  add column if not exists avatar_url text;

alter table if exists public.users
  alter column name drop not null;

alter table if exists public.users
  alter column created_at set default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'role'
  ) then
    execute 'alter table public.users alter column role drop not null';
  end if;
end $$;

-- Target institution model
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  timezone text,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text,
  term text,
  start_date date,
  end_date date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('INSTITUTION_ADMIN', 'EDUCATOR', 'STUDENT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create table if not exists public.course_memberships (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('EDUCATOR', 'STUDENT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'DROPPED')),
  created_at timestamptz not null default now(),
  unique (course_id, user_id)
);

-- Preserve legacy invites by renaming when current invites is legacy schema.
-- Handles partial/failed prior runs where invites_legacy may already exist.
do $$
declare
  legacy_name text;
begin
  if to_regclass('public.invites') is not null
     and not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'invites'
         and column_name = 'token_hash'
     )
  then
    if to_regclass('public.invites_legacy') is null then
      execute 'alter table public.invites rename to invites_legacy';
    else
      legacy_name := 'invites_legacy_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
      execute format('alter table public.invites rename to %I', legacy_name);
    end if;
  end if;
end $$;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('INSTITUTION_ADMIN', 'EDUCATOR', 'STUDENT')),
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by_user_id uuid references public.users(id) on delete set null,
  metadata jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create table if not exists public.case_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  case_id text not null,
  score int,
  is_correct boolean,
  duration_sec int,
  institution_id uuid references public.institutions(id),
  course_id uuid references public.courses(id),
  created_at timestamptz not null default now()
);

-- Performance indexes
create index if not exists idx_institutions_slug on public.institutions(slug);
create index if not exists idx_courses_institution_id on public.courses(institution_id);
create unique index if not exists idx_courses_institution_code_unique on public.courses(institution_id, code) where code is not null;
create index if not exists idx_institution_memberships_institution_user on public.institution_memberships(institution_id, user_id);
create index if not exists idx_course_memberships_course_user on public.course_memberships(course_id, user_id);
create index if not exists idx_invites_institution_course_email on public.invites(institution_id, course_id, email);
create index if not exists idx_case_attempts_course_created_at on public.case_attempts(course_id, created_at);

-- Legacy data migration: organizations -> institutions
do $$
begin
  if to_regclass('public.organizations') is not null then
    execute $sql$
      insert into public.institutions (id, name, slug, logo_url, timezone, created_at)
      select
        o.id,
        o.name,
        o.slug,
        to_jsonb(o) ->> 'logo_url',
        null,
        coalesce((to_jsonb(o) ->> 'created_at')::timestamptz, now())
      from public.organizations o
      on conflict (id)
      do update set
        name = excluded.name,
        slug = excluded.slug,
        logo_url = excluded.logo_url
    $sql$;
  end if;
end $$;

-- Legacy data migration: org_members -> institution_memberships
do $$
begin
  if to_regclass('public.org_members') is not null then
    execute $sql$
      insert into public.institution_memberships (id, institution_id, user_id, role, status, created_at)
      select
        gen_random_uuid(),
        om.org_id,
        om.user_id,
        case
          when coalesce(to_jsonb(om) ->> 'role', '') = 'org_admin' then 'INSTITUTION_ADMIN'
          when coalesce(to_jsonb(om) ->> 'role', '') = 'teacher' then 'EDUCATOR'
          else 'STUDENT'
        end,
        'ACTIVE',
        coalesce((to_jsonb(om) ->> 'created_at')::timestamptz, now())
      from public.org_members om
      where om.org_id is not null
        and om.user_id is not null
      on conflict (institution_id, user_id)
      do update set
        role = excluded.role,
        status = 'ACTIVE'
    $sql$;
  end if;
end $$;

-- Legacy data migration: cohorts -> courses
do $$
begin
  if to_regclass('public.cohorts') is not null then
    execute $sql$
      insert into public.courses (id, institution_id, name, code, term, created_at)
      select
        c.id,
        c.org_id,
        c.name,
        null,
        to_jsonb(c) ->> 'term',
        coalesce((to_jsonb(c) ->> 'created_at')::timestamptz, now())
      from public.cohorts c
      where c.org_id is not null
      on conflict (id)
      do update set
        institution_id = excluded.institution_id,
        name = excluded.name,
        term = excluded.term
    $sql$;
  end if;
end $$;

-- Legacy data migration: cohort_members -> course_memberships
do $$
begin
  if to_regclass('public.cohort_members') is not null and to_regclass('public.cohorts') is not null then
    execute $sql$
      insert into public.course_memberships (id, course_id, user_id, role, status, created_at)
      select
        gen_random_uuid(),
        cm.cohort_id,
        cm.user_id,
        case
          when coalesce(to_jsonb(om) ->> 'role', 'student') in ('teacher', 'org_admin') then 'EDUCATOR'
          else 'STUDENT'
        end,
        'ACTIVE',
        coalesce((to_jsonb(cm) ->> 'created_at')::timestamptz, now())
      from public.cohort_members cm
      join public.cohorts c on c.id = cm.cohort_id
      left join public.org_members om on om.org_id = c.org_id and om.user_id = cm.user_id
      where cm.cohort_id is not null
        and cm.user_id is not null
      on conflict (course_id, user_id)
      do update set
        role = excluded.role,
        status = 'ACTIVE'
    $sql$;
  end if;
end $$;

-- Legacy invites -> new invites.
-- Migrates from public.invites_legacy and any public.invites_legacy_* table.
do $$
declare
  src_table text;
begin
  for src_table in
    select t.table_name
    from information_schema.tables t
    where t.table_schema = 'public'
      and (
        t.table_name = 'invites_legacy'
        or t.table_name like 'invites_legacy_%'
      )
      and exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = t.table_name
          and c.column_name = 'token'
      )
  loop
    execute format($sql$
      insert into public.invites (
        id,
        institution_id,
        course_id,
        email,
        role,
        token_hash,
        expires_at,
        accepted_at,
        created_by_user_id,
        metadata,
        last_error,
        created_at
      )
      select
        gen_random_uuid(),
        i.id,
        c.id,
        lower(to_jsonb(il) ->> 'email'),
        case
          when coalesce(to_jsonb(il) ->> 'role', '') = 'org_admin' then 'INSTITUTION_ADMIN'
          when coalesce(to_jsonb(il) ->> 'role', '') = 'teacher' then 'EDUCATOR'
          else 'STUDENT'
        end,
        public.medlab_token_hash((to_jsonb(il) ->> 'token')::text),
        coalesce((to_jsonb(il) ->> 'expires_at')::timestamptz, now() + interval '7 days'),
        (to_jsonb(il) ->> 'accepted_at')::timestamptz,
        null,
        jsonb_strip_nulls(
          jsonb_build_object(
            'full_name', to_jsonb(il) ->> 'full_name',
            'teacher_id', to_jsonb(il) ->> 'teacher_id'
          )
        ),
        null,
        coalesce((to_jsonb(il) ->> 'created_at')::timestamptz, now())
      from public.%I il
      join public.institutions i on i.id = nullif(to_jsonb(il) ->> 'org_id', '')::uuid
      left join public.courses c on c.id = nullif(to_jsonb(il) ->> 'cohort_id', '')::uuid
      where (to_jsonb(il) ->> 'email') is not null
        and (to_jsonb(il) ->> 'token') is not null
      on conflict (token_hash)
      do nothing
    $sql$, src_table);
  end loop;
end $$;

-- Special rule: create default course for institutions with zero courses.
insert into public.courses (institution_id, name, code, is_archived, created_at)
select
  i.id,
  'General',
  'DEFAULT',
  false,
  now()
from public.institutions i
where not exists (
  select 1
  from public.courses c
  where c.institution_id = i.id
)
on conflict do nothing;

-- Backfill default course memberships from active institution memberships.
with default_courses as (
  select c.id, c.institution_id
  from public.courses c
  where c.code = 'DEFAULT'
),
active_members as (
  select im.institution_id, im.user_id, im.role
  from public.institution_memberships im
  where im.status = 'ACTIVE'
    and im.role in ('EDUCATOR', 'STUDENT')
)
insert into public.course_memberships (id, course_id, user_id, role, status, created_at)
select
  gen_random_uuid(),
  dc.id,
  am.user_id,
  am.role,
  'ACTIVE',
  now()
from default_courses dc
join active_members am on am.institution_id = dc.institution_id
on conflict (course_id, user_id)
do update set
  role = excluded.role,
  status = 'ACTIVE';

-- Enable RLS on new tables
alter table public.auth_users enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_accounts enable row level security;
alter table public.auth_verifications enable row level security;
alter table public.institutions enable row level security;
alter table public.courses enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.course_memberships enable row level security;
alter table public.invites enable row level security;
alter table public.case_attempts enable row level security;

-- Explicit safe default: deny anon access on new tables.
do $$
declare
  tbl text;
  tables text[] := array[
    'auth_users',
    'auth_sessions',
    'auth_accounts',
    'auth_verifications',
    'institutions',
    'courses',
    'institution_memberships',
    'course_memberships',
    'invites',
    'case_attempts'
  ];
begin
  foreach tbl in array tables
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_deny_anon'
    ) then
      execute format(
        'create policy %I on public.%I for all to anon using (false) with check (false)',
        tbl || '_deny_anon',
        tbl
      );
    end if;
  end loop;
end $$;
