import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { logoutAction } from "@/app/actions/auth"

export default async function AccountPage() {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("name, role, email").eq("id", user.id).maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Account</p>
          <h1 className="text-3xl font-bold">Your profile</h1>
        </div>
        <div className="space-y-2 text-sm">
          <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="font-medium text-slate-900">{profile?.name ?? "—"}</div>
          </div>
          <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-medium text-slate-900">{profile?.email ?? user.email}</div>
          </div>
          <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
            <div className="text-xs text-muted-foreground">Role</div>
            <div className="font-medium text-slate-900">{profile?.role ?? "user"}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <a href="/" className="text-sm text-blue-600 hover:underline">
            Back
          </a>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex items-center rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
