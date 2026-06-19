import { NextResponse } from "next/server"

import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export async function DELETE(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const { error } = await supabaseAdmin.auth.admin.deleteUser(context.user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from("profiles").delete().eq("id", context.user.id)
  return NextResponse.json({ success: true })
}
