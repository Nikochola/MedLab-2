import { NextResponse } from "next/server"

import { createInstitutionAccessRequest } from "@/server/institution/access"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    await createInstitutionAccessRequest({
      fullName: String(body.fullName || ""),
      workEmail: String(body.workEmail || ""),
      institutionName: String(body.institutionName || ""),
      institutionType: body.institutionType,
      estimatedStudents: Number(body.estimatedStudents || 0),
      message: String(body.message || ""),
      wantsMeeting: Boolean(body.wantsMeeting)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit request." },
      { status: 400 }
    )
  }
}
