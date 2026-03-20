import crypto from "crypto"

import { NextResponse } from "next/server"

import { ensureDefaultCourse } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (process.env.ENABLE_ADMIN_BOOTSTRAP !== "true") {
    return NextResponse.json({ error: "Bootstrap disabled" }, { status: 403 })
  }

  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase()

  if (!bootstrapEmail) {
    return NextResponse.json({ error: "Missing ADMIN_BOOTSTRAP_EMAIL" }, { status: 400 })
  }

  const { data: existingUserByEmail, error: existingUserError } = await supabaseAdmin
    .from("users")
    .select("id,email")
    .eq("email", bootstrapEmail)
    .maybeSingle()

  if (existingUserError) {
    return NextResponse.json({ error: existingUserError.message }, { status: 500 })
  }

  const userId = existingUserByEmail?.id || crypto.randomUUID()

  const { error: upsertUserError } = await supabaseAdmin.from("users").upsert(
    {
      id: userId,
      email: bootstrapEmail,
      name: bootstrapEmail.split("@")[0],
      created_at: new Date().toISOString()
    },
    { onConflict: "id" }
  )

  if (upsertUserError) {
    return NextResponse.json({ error: upsertUserError.message }, { status: 500 })
  }

  let institutionId: string | null = null

  const { data: firstInstitution, error: institutionSelectError } = await supabaseAdmin
    .from("institutions")
    .select("id,name,slug")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (institutionSelectError) {
    return NextResponse.json({ error: institutionSelectError.message }, { status: 500 })
  }

  if (firstInstitution?.id) {
    institutionId = firstInstitution.id
  } else {
    const defaultInstitutionName = process.env.ADMIN_BOOTSTRAP_INSTITUTION_NAME || "General Institution"

    const { data: insertedInstitution, error: institutionInsertError } = await supabaseAdmin
      .from("institutions")
      .insert({
        name: defaultInstitutionName,
        slug: slugify(defaultInstitutionName) || `institution-${Date.now()}`
      })
      .select("id")
      .single()

    if (institutionInsertError || !insertedInstitution) {
      return NextResponse.json({ error: institutionInsertError?.message || "Failed to create institution" }, { status: 500 })
    }

    institutionId = insertedInstitution.id
  }

  if (!institutionId) {
    return NextResponse.json({ error: "Missing institution id after bootstrap" }, { status: 500 })
  }

  const { error: membershipError } = await supabaseAdmin.from("institution_memberships").upsert(
    {
      institution_id: institutionId,
      user_id: userId,
      role: "INSTITUTION_ADMIN",
      status: "ACTIVE"
    },
    { onConflict: "institution_id,user_id" }
  )

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  await ensureDefaultCourse(institutionId)

  return NextResponse.json({
    ok: true,
    email: bootstrapEmail,
    user_id: userId,
    institution_id: institutionId
  })
}
