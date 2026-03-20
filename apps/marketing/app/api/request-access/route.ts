import { NextResponse } from "next/server"
import { getInstitutionAppOrigin } from "../../lib/runtimeUrls"

const webAppUrl = getInstitutionAppOrigin()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${webAppUrl.replace(/\/+$/, "")}/api/institution/request-access`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })

    const json = await response.json()
    return NextResponse.json(json, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit request." },
      { status: 500 }
    )
  }
}
