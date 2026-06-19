import { NextResponse } from "next/server"

import { POST as generateXray } from "../../../xray/generate/route"
import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"

export async function POST(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  return generateXray(request as any)
}
