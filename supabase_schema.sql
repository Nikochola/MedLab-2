-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('teacher','student')),
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
  assessment jsonb
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

create policy "Allow anon read classrooms" on classrooms for select using (true);
create policy "Allow anon insert classrooms" on classrooms for insert with check (true);

create policy "Allow anon read activities" on student_activities for select using (true);
create policy "Allow anon insert activities" on student_activities for insert with check (true);

create policy "Allow anon read progress" on student_progress for select using (true);
create policy "Allow anon upsert progress" on student_progress for insert with check (true);
create policy "Allow anon update progress" on student_progress for update using (true) with check (true);

create policy "Allow anon read assessments" on case_assessments for select using (true);
create policy "Allow anon insert assessments" on case_assessments for insert with check (true);
