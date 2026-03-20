import { NextResponse } from "next/server"

import { createInstitutionForUser } from "@/server/institution/onboarding"
import { supabaseAdmin } from "@/server/supabaseAdmin"

const TEST_INSTITUTION_NAME = "Test Medical School"
const TEST_INSTITUTION_SLUG = "test-medical-school"

const USERS = [
  {
    email: "admin@test-institution.dev",
    password: "TestAdmin123!",
    name: "Test Admin",
    primaryRole: "institution",
    membershipRole: "INSTITUTION_ADMIN" as const
  },
  {
    email: "educator@test-institution.dev",
    password: "TestEducator123!",
    name: "Test Educator",
    primaryRole: "institution",
    membershipRole: "EDUCATOR" as const
  },
  {
    email: "student@test-institution.dev",
    password: "TestStudent123!",
    name: "Test Student",
    primaryRole: "student",
    membershipRole: "STUDENT" as const
  }
]

async function findAuthUserByEmail(email: string): Promise<string | null> {
  // Scan paginated GoTrue admin users to find by email
  let page = 1
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
    if (error || !data?.users?.length) break
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match.id
    if (data.users.length < 100) break // last page
    page++
  }
  return null
}

async function upsertAuthUser(user: (typeof USERS)[number]): Promise<string> {
  const email = user.email.toLowerCase()

  // 1. Check profiles table (fast path — service role bypasses RLS)
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existingProfile?.id) {
    await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name, primary_role: user.primaryRole }
    })
    return existingProfile.id
  }

  // 2. Try to create fresh
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.name, primary_role: user.primaryRole }
  })

  if (!createError && created.user) {
    return created.user.id
  }

  // 3. Creation failed (user likely exists in auth.users without a profile) — find via pagination
  const existingId = await findAuthUserByEmail(email)
  if (existingId) {
    await supabaseAdmin.auth.admin.updateUserById(existingId, {
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name, primary_role: user.primaryRole }
    })
    return existingId
  }

  throw new Error(`Failed to create or find user ${email}: ${createError?.message}`)
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const provisionedUsers: Array<{ email: string; userId: string; membershipRole: string }> = []

    for (const user of USERS) {
      const userId = await upsertAuthUser(user)

      // Ensure profile row is up to date
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email: user.email.toLowerCase(),
          full_name: user.name,
          primary_role: user.primaryRole
        },
        { onConflict: "id" }
      )

      provisionedUsers.push({ email: user.email, userId, membershipRole: user.membershipRole })
    }

    const adminUser = provisionedUsers[0]!

    // Check if test institution already exists
    const { data: existingInstitution } = await supabaseAdmin
      .from("institutions")
      .select("id,name,slug")
      .eq("slug", TEST_INSTITUTION_SLUG)
      .maybeSingle()

    let institutionId: string

    if (existingInstitution?.id) {
      institutionId = existingInstitution.id

      await supabaseAdmin.from("institution_memberships").upsert(
        {
          institution_id: institutionId,
          user_id: adminUser.userId,
          role: "INSTITUTION_ADMIN",
          status: "ACTIVE"
        },
        { onConflict: "institution_id,user_id" }
      )
    } else {
      const institution = await createInstitutionForUser({
        userId: adminUser.userId,
        institutionName: TEST_INSTITUTION_NAME,
        workspaceSlug: TEST_INSTITUTION_SLUG,
        institutionType: "Medical School",
        billingPlan: "STARTER",
        contentLibrary: "BOTH",
        studentAccessPolicy: "INVITE_ONLY"
      })
      institutionId = institution.id
    }

    // Upsert educator + student memberships
    for (const user of provisionedUsers.slice(1)) {
      await supabaseAdmin.from("institution_memberships").upsert(
        {
          institution_id: institutionId,
          user_id: user.userId,
          role: user.membershipRole,
          status: "ACTIVE"
        },
        { onConflict: "institution_id,user_id" }
      )
    }

    // Add all users to the default course
    const { data: defaultCourse } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("code", "DEFAULT")
      .maybeSingle()

    if (defaultCourse?.id) {
      for (const user of provisionedUsers) {
        const courseRole = user.membershipRole === "STUDENT" ? "STUDENT" : "EDUCATOR"
        await supabaseAdmin.from("course_memberships").upsert(
          {
            course_id: defaultCourse.id,
            user_id: user.userId,
            role: courseRole,
            status: "ACTIVE"
          },
          { onConflict: "course_id,user_id" }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      institution: {
        id: institutionId,
        name: TEST_INSTITUTION_NAME,
        slug: TEST_INSTITUTION_SLUG
      },
      logins: provisionedUsers.map((u) => ({
        email: u.email,
        role: u.membershipRole,
        password: USERS.find((usr) => usr.email === u.email)?.password
      }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
