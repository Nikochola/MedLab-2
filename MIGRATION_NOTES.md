# MedLab Migration Notes

## 1) Final App Topology
- Product app: `apps/web` (deploy to `app.medlab.com`)
- Marketing app: `apps/marketing` (deploy to `medlab.com`)
- Legacy apps removed: `apps/student`, `apps/university`

## 2) Unified Product Routes (`apps/web`)
### Auth + onboarding
- `/login`
- `/signup` -> redirects to `/login?mode=signup`
- `/auth/redirect`
- `/onboarding`
- `/invite/[token]`

### Institution
- `/institution` -> redirects to `/institution/courses`
- `/institution/courses`
- `/institution/courses/[courseId]/students`
- `/institution/courses/[courseId]/educators`
- `/institution/courses/[courseId]/analytics`
- `/institution/settings`

### Student
- `/practice`
- `/ecg/practice`
- `/ecg/cases`
- `/xray/practice`
- `/xray/cases`
- `/journey`
- `/learn`
- `/progress`

### Dev-only
- `/dev/auth-debug` (only non-production)
- `POST /api/dev/bootstrap-admin` (env-gated)

## 3) Role Redirects
- `INSTITUTION_ADMIN` or `EDUCATOR` -> `/institution/courses`
- `STUDENT` -> `/practice`

## 4) New Database Objects
Migrations:
- `supabase/migrations/20260226_0001_institution_unification.sql`
- `supabase/migrations/20260227_0002_auth_reconciliation_onboarding.sql`

Core tables:
- `institutions`
- `courses`
- `users` (profile table)
- `institution_memberships`
- `course_memberships`
- `invites` (token hash)
- `case_attempts`
- `user_identities` (legacy-to-canonical mapping)

Better Auth tables:
- `auth_users`
- `auth_sessions`
- `auth_accounts`
- `auth_verifications`

## 5) Legacy Migration Coverage
- `organizations` -> `institutions`
- `org_members` -> `institution_memberships`
- `cohorts` -> `courses`
- `cohort_members` -> `course_memberships`
- legacy `invites` -> new hashed `invites`
- email-based auth/profile reconciliation via `user_identities`

## 6) Default Course Rule
For every institution with zero courses:
- create `General` with code `DEFAULT`
- enroll active educators/students into that course

## 7) CSV Invite Flow
Students page:
- Manual invite
- CSV upload
- Template download

Student CSV columns:
- `student_email` or `email` (required)
- `student_name` (optional)
- `educator_name` (optional -> `invites.metadata.educator_name`)
- `educator_email` (optional -> `invites.metadata.educator_email`)

Educator CSV columns:
- `educator_email` or `email` (required)
- `educator_name` (optional)

Behavior:
- validate emails
- dedupe upload + pending invites
- persist invite rows
- send Resend invites
- capture send failures in `invites.last_error`

## 8) Invite Acceptance
- route: `/invite/[token]`
- requires login with invited email
- verifies token by hash
- provisions profile row
- upserts institution + course memberships
- marks `accepted_at`
- redirects by resolved role

## 9) Admin Bootstrap (Dev)
Endpoint:
- `POST /api/dev/bootstrap-admin`

Required env:
- `ENABLE_ADMIN_BOOTSTRAP=true`
- `ADMIN_BOOTSTRAP_EMAIL=<email>`

Optional env:
- `ADMIN_BOOTSTRAP_INSTITUTION_NAME=<name>`

## 10) Required Environment Variables (`apps/web`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BETTER_AUTH_DATABASE_URL` (preferred)
  - fallback support: `DATABASE_URL`, `SUPABASE_DB_URL`, `POSTGRES_URL`
  - optional assembly fallback: `SUPABASE_POOLER_URL` + `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_APP_URL` (for invite links)
- `RESEND_API_KEY`
- `INVITE_FROM_EMAIL`

## 11) Supabase Commands
Install:
```bash
pnpm install
```

Link (if not linked):
```bash
supabase link --project-ref <project-ref>
```

Apply migrations:
```bash
supabase db push
```

## 12) Dev Commands
Run both apps:
```bash
pnpm dev
```

Run only product app:
```bash
pnpm dev:web
```

Run only marketing app:
```bash
pnpm dev:marketing
```

## 13) Manual Verification Checklist
1. `pnpm install`
2. `supabase db push`
3. `pnpm dev`
4. Log in as institution admin -> redirected to `/institution/courses`
5. New account with no memberships -> `/onboarding` -> create institution -> `/institution/courses`
6. Manual student invite -> email -> accept invite -> appears in student roster -> student lands in `/practice`
7. CSV upload on students page -> summary appears -> invites sent -> accepted users appear in roster
8. Student login -> `/practice` + `/ecg/*` + `/xray/*` + `/journey` load
9. Marketing routes load (`/`, `/students`, `/institutions`, `/educators`, `/pricing`, `/privacy`, `/terms`) and CTA points to `https://app.medlab.com/login`
