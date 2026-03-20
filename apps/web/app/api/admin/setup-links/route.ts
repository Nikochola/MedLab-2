import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

import { getServerSession } from "@/server/auth/session"
import { createDirectSetupLink } from "@/server/institution/access"
import type { InstitutionRequestType } from "@/server/institution/access"

function allowedTeamEmails() {
  const raw = process.env.MEDLAB_TEAM_EMAILS || process.env.ADMIN_BOOTSTRAP_EMAIL || ""
  return raw.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  const email = session?.user?.email?.trim().toLowerCase()
  const allowlist = allowedTeamEmails()

  if (!email || !allowlist.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const result = await createDirectSetupLink({
    fullName: body.fullName,
    workEmail: body.workEmail,
    institutionName: body.institutionName,
    institutionType: body.institutionType as InstitutionRequestType,
    estimatedStudents: body.estimatedStudents,
    adminEmail: "admin@getmedlab.com",
  })

  return NextResponse.json(result)
}
