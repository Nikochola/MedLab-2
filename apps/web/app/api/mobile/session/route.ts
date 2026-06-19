import { NextResponse } from "next/server"

import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"

export async function GET(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.profile?.full_name || context.profile?.name || context.user.name || context.user.email.split("@")[0],
      avatarUrl: context.profile?.avatar_url || null,
      primaryRole: context.profile?.primary_role || "student",
      createdAt: context.profile?.created_at || null,
    },
    role: context.role,
    memberships: context.memberships,
    destination: context.role === "institution_admin" || context.role === "educator" ? "web-institution" : "student",
  })
}
