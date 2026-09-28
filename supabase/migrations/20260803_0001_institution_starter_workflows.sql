-- Starter institutional workflow: educator ownership, case assignments, and
-- course-linked practice attempts.

-- Reconcile a short-lived March schema rename with the institution application,
-- which consistently uses classes (`courses`) and role names in uppercase.
do $$
begin
  if to_regclass('public.courses') is null and to_regclass('public.cohorts') is not null then
    alter table public.cohorts rename to courses;
  end if;

  if to_regclass('public.course_memberships') is null and to_regclass('public.cohort_members') is not null then
    alter table public.cohort_members rename to course_memberships;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'course_memberships' and column_name = 'cohort_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'course_memberships' and column_name = 'course_id'
  ) then
    alter table public.course_memberships rename column cohort_id to course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'course_memberships' and column_name = 'student_user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'course_memberships' and column_name = 'user_id'
  ) then
    alter table public.course_memberships rename column student_user_id to user_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'created_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'created_by_user_id'
  ) then
    alter table public.invites rename column created_by to created_by_user_id;
  end if;
end $$;

update public.institution_memberships set role = 'INSTITUTION_ADMIN' where lower(role) = 'admin';
update public.institution_memberships set role = 'EDUCATOR' where lower(role) = 'teacher';

-- Authenticated clients need to be able to resolve their own membership in
-- middleware before the server-side portal performs its stricter role checks.
alter table public.institution_memberships enable row level security;
drop policy if exists "Users can view their own institution memberships" on public.institution_memberships;
create policy "Users can view their own institution memberships"
on public.institution_memberships for select to authenticated
using (user_id = auth.uid());

alter table public.course_memberships enable row level security;
drop policy if exists "Students can view their own cohort memberships" on public.course_memberships;
drop policy if exists "Teachers can view cohort memberships in their institution" on public.course_memberships;
drop policy if exists "Users can view their own course memberships" on public.course_memberships;
create policy "Users can view their own course memberships"
on public.course_memberships for select to authenticated
using (user_id = auth.uid());

-- Invitations are created and inspected by administrators through the server
-- portal. Remove the broader legacy policies that exposed an institution's
-- invite list to every member.
drop policy if exists "Institutions can view their invites" on public.invites;
drop policy if exists "Institution admins/teachers can create invites" on public.invites;
drop policy if exists "Institution admins manage invites" on public.invites;
create policy "Institution admins manage invites"
on public.invites for all to authenticated
using (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = invites.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
  )
)
with check (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = invites.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
  )
);

create table if not exists public.educator_student_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  educator_user_id uuid not null references public.profiles(id) on delete cascade,
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, student_user_id),
  check (educator_user_id <> student_user_id)
);

create table if not exists public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  instructions text,
  case_ids jsonb not null default '[]'::jsonb,
  due_at timestamptz,
  status text not null default 'PUBLISHED' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_assignment_students (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.case_assignments(id) on delete cascade,
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (assignment_id, student_user_id)
);

alter table if exists public.case_attempts
  add column if not exists assignment_id uuid references public.case_assignments(id) on delete set null,
  add column if not exists client_attempt_id text,
  add column if not exists modality text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_educator_student_assignments_institution
  on public.educator_student_assignments(institution_id);
create index if not exists idx_educator_student_assignments_educator
  on public.educator_student_assignments(course_id, educator_user_id);
create index if not exists idx_case_assignments_course_due
  on public.case_assignments(course_id, due_at);
create index if not exists idx_case_assignment_students_student
  on public.case_assignment_students(student_user_id, status);
create index if not exists idx_case_attempts_user_course_created
  on public.case_attempts(user_id, course_id, created_at desc);
create index if not exists idx_case_attempts_assignment
  on public.case_attempts(assignment_id);
create unique index if not exists idx_case_attempts_idempotency
  on public.case_attempts(user_id, course_id, client_attempt_id)
  where client_attempt_id is not null;

alter table public.educator_student_assignments enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_assignment_students enable row level security;

drop policy if exists "Institution staff can view educator student assignments" on public.educator_student_assignments;
create policy "Institution staff can view educator student assignments"
on public.educator_student_assignments for select
using (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = educator_student_assignments.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and (
        upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
        or (
          upper(im.role) in ('EDUCATOR', 'TEACHER')
          and educator_student_assignments.educator_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Institution admins manage educator student assignments" on public.educator_student_assignments;
create policy "Institution admins manage educator student assignments"
on public.educator_student_assignments for all
using (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = educator_student_assignments.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
  )
)
with check (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = educator_student_assignments.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
  )
);

drop policy if exists "Course members can view case assignments" on public.case_assignments;
create policy "Course members can view case assignments"
on public.case_assignments for select
using (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = case_assignments.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
  )
  or exists (
    select 1 from public.course_memberships cm
    where cm.course_id = case_assignments.course_id
      and cm.user_id = auth.uid()
      and cm.status = 'ACTIVE'
  )
);

drop policy if exists "Institution staff manage case assignments" on public.case_assignments;
create policy "Institution staff manage case assignments"
on public.case_assignments for all
using (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = case_assignments.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and (
        upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
        or (
          upper(im.role) in ('EDUCATOR', 'TEACHER')
          and case_assignments.created_by_user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1 from public.institution_memberships im
    where im.institution_id = case_assignments.institution_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and (
        upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
        or (
          upper(im.role) in ('EDUCATOR', 'TEACHER')
          and case_assignments.created_by_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Assignment participants can view targets" on public.case_assignment_students;
create policy "Assignment participants can view targets"
on public.case_assignment_students for select
using (
  student_user_id = auth.uid()
  or exists (
    select 1
    from public.case_assignments assignment
    join public.institution_memberships im on im.institution_id = assignment.institution_id
    where assignment.id = case_assignment_students.assignment_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and (
        upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
        or (
          upper(im.role) in ('EDUCATOR', 'TEACHER')
          and assignment.created_by_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Institution staff manage assignment targets" on public.case_assignment_students;
create policy "Institution staff manage assignment targets"
on public.case_assignment_students for all
using (
  exists (
    select 1
    from public.case_assignments assignment
    join public.institution_memberships im on im.institution_id = assignment.institution_id
    where assignment.id = case_assignment_students.assignment_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and (
        upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
        or (
          upper(im.role) in ('EDUCATOR', 'TEACHER')
          and assignment.created_by_user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.case_assignments assignment
    join public.institution_memberships im on im.institution_id = assignment.institution_id
    where assignment.id = case_assignment_students.assignment_id
      and im.user_id = auth.uid()
      and im.status = 'ACTIVE'
      and (
        upper(im.role) in ('INSTITUTION_ADMIN', 'ADMIN')
        or (
          upper(im.role) in ('EDUCATOR', 'TEACHER')
          and assignment.created_by_user_id = auth.uid()
        )
      )
  )
);
