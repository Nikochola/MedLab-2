-- Better Auth reconciliation hardening
-- Ensures legacy profile IDs are mapped to Better Auth canonical IDs by email.

create extension if not exists pgcrypto;

create table if not exists public.user_identities (
  id uuid primary key default gen_random_uuid(),
  canonical_user_id uuid not null references public.users(id) on delete cascade,
  legacy_user_id uuid not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  unique (canonical_user_id, legacy_user_id)
);

create index if not exists idx_user_identities_canonical on public.user_identities(canonical_user_id);
create index if not exists idx_user_identities_email on public.user_identities(email);

-- Reconcile by email when auth_users and users are both present.
do $$
begin
  if to_regclass('public.auth_users') is not null and to_regclass('public.users') is not null then
    -- Preserve legacy profile rows by aliasing emails before canonical insertion.
    update public.users u
    set email = lower(split_part(u.email, '@', 1) || '+legacy-' || replace(u.id::text, '-', '') || '@legacy.medlab.invalid')
    from public.auth_users au
    where lower(au.email) = lower(u.email)
      and au.id <> u.id
      and u.email not like '%@legacy.medlab.invalid';

    -- Ensure canonical Better Auth profile row exists in public.users.
    insert into public.users (id, email, name, avatar_url, created_at)
    select
      au.id,
      lower(au.email),
      au.name,
      au.image,
      coalesce(au.created_at, now())
    from public.auth_users au
    on conflict (id)
    do update
      set email = excluded.email,
          name = coalesce(excluded.name, public.users.name),
          avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

    -- Track legacy -> canonical identity mapping.
    insert into public.user_identities (canonical_user_id, legacy_user_id, email)
    select
      au.id as canonical_user_id,
      u.id as legacy_user_id,
      lower(au.email) as email
    from public.auth_users au
    join public.users u on lower(au.email) = lower(u.email)
    where au.id <> u.id
    on conflict (legacy_user_id) do nothing;

    -- Migrate institution memberships to canonical IDs.
    insert into public.institution_memberships (id, institution_id, user_id, role, status, created_at)
    select
      gen_random_uuid(),
      im.institution_id,
      ui.canonical_user_id,
      im.role,
      im.status,
      im.created_at
    from public.institution_memberships im
    join public.user_identities ui on ui.legacy_user_id = im.user_id
    on conflict (institution_id, user_id)
    do update
      set role = excluded.role,
          status = excluded.status;

    delete from public.institution_memberships im
    using public.user_identities ui
    where im.user_id = ui.legacy_user_id;

    -- Migrate course memberships to canonical IDs.
    insert into public.course_memberships (id, course_id, user_id, role, status, created_at)
    select
      gen_random_uuid(),
      cm.course_id,
      ui.canonical_user_id,
      cm.role,
      cm.status,
      cm.created_at
    from public.course_memberships cm
    join public.user_identities ui on ui.legacy_user_id = cm.user_id
    on conflict (course_id, user_id)
    do update
      set role = excluded.role,
          status = excluded.status;

    delete from public.course_memberships cm
    using public.user_identities ui
    where cm.user_id = ui.legacy_user_id;

    if to_regclass('public.case_attempts') is not null then
      update public.case_attempts ca
      set user_id = ui.canonical_user_id
      from public.user_identities ui
      where ca.user_id = ui.legacy_user_id
        and ca.user_id <> ui.canonical_user_id;
    end if;

    if to_regclass('public.invites') is not null then
      update public.invites i
      set created_by_user_id = ui.canonical_user_id
      from public.user_identities ui
      where i.created_by_user_id = ui.legacy_user_id
        and i.created_by_user_id <> ui.canonical_user_id;
    end if;

    if to_regclass('public.subscriptions') is not null then
      update public.subscriptions s
      set user_id = ui.canonical_user_id
      from public.user_identities ui
      where s.user_id = ui.legacy_user_id
        and s.user_id <> ui.canonical_user_id;
    end if;

    if to_regclass('public.usage_limits') is not null then
      update public.usage_limits ul
      set user_id = ui.canonical_user_id
      from public.user_identities ui
      where ul.user_id = ui.legacy_user_id
        and ul.user_id <> ui.canonical_user_id;
    end if;

    if to_regclass('public.student_progress') is not null then
      update public.student_progress sp
      set student_id = ui.canonical_user_id
      from public.user_identities ui
      where sp.student_id = ui.legacy_user_id
        and sp.student_id <> ui.canonical_user_id;
    end if;

    if to_regclass('public.student_activities') is not null then
      update public.student_activities sa
      set student_id = ui.canonical_user_id
      from public.user_identities ui
      where sa.student_id = ui.legacy_user_id
        and sa.student_id <> ui.canonical_user_id;
    end if;
  end if;
end $$;

alter table public.user_identities enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_identities'
      and policyname = 'user_identities_deny_anon'
  ) then
    create policy user_identities_deny_anon
      on public.user_identities
      for all
      to anon
      using (false)
      with check (false);
  end if;
end $$;
