import { NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { acceptInvite } from "@/server/institution/invites"

const allowedTypes = new Set<EmailOtpType>(["magiclink", "invite"])

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const rawType = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const inviteToken = request.nextUrl.searchParams.get("invite_token")

  if (!tokenHash || !rawType || !allowedTypes.has(rawType) || !inviteToken) {
    return NextResponse.redirect(new URL("/institution/login?error=invalid_magic_link", request.url))
  }

  const authCookies: Array<{ name: string; value: string; options: CookieOptions }> = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          authCookies.push(...cookies)
        }
      }
    }
  )

  const { data, error } = await supabase.auth.verifyOtp({ type: rawType, token_hash: tokenHash })
  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL("/institution/login?error=expired_magic_link", request.url))
  }

  let destination = "/learn"
  try {
    destination = await acceptInvite({
      token: inviteToken,
      userId: data.user.id,
      userEmail: data.user.email,
      userName: String(data.user.user_metadata?.full_name || data.user.user_metadata?.name || "") || null
    })
  } catch {
    return NextResponse.redirect(new URL("/institution/login?error=invite_activation_failed", request.url))
  }

  const response = NextResponse.redirect(new URL(destination, request.url))
  authCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
