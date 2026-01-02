import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

async function requirePlatformAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "platform_admin") {
    redirect("/")
  }

  return { userId: user.id, name: profile?.name ?? "Platform Admin" }
}

async function searchUsers(query: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role, deactivated")
    .ilike("email", `%${query}%`)
    .limit(20)

  if (error) {
    console.error("searchUsers error:", error)
    return []
  }
  return data ?? []
}

async function updateUserRole(formData: FormData) {
  "use server"
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "platform_admin") redirect("/")

  const userId = formData.get("userId") as string
  const role = formData.get("role") as string
  const deactivated = formData.get("deactivated") === "on"

  await supabase.from("users").update({ role, deactivated }).eq("id", userId)
  await supabase.from("platform_audit").insert({
    actor_user_id: user.id,
    actor_role: profile.role,
    action: "user_update",
    target_type: "user",
    target_id: userId,
    metadata: { role, deactivated },
  })

  revalidatePath("/platform-admin/users")
}

export default async function PlatformAdminUsersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const profile = await requirePlatformAdmin()
  const q = searchParams?.q ?? ""
  const results = q ? await searchUsers(q) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Platform Admin</p>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-2">Search and manage global users.</p>
          <p className="text-sm text-muted-foreground mt-1">Signed in as {profile.name}</p>
        </div>

        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by email"
            className="flex-1 rounded-lg border border-input bg-white px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
            Search
          </button>
        </form>

        <div className="rounded-xl border border-border bg-white shadow-sm">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            <div className="col-span-4">User</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          <div className="divide-y divide-border">
            {!results.length && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results</div>}
            {results.map((user) => (
              <div key={user.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.id}</div>
                </div>
                <div className="col-span-3 text-muted-foreground">{user.email}</div>
                <div className="col-span-2 text-muted-foreground">{user.role}</div>
                <div className="col-span-3 text-right">
                  <form action={updateUserRole} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="role" defaultValue={user.role} className="rounded border px-2 py-1 text-xs">
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="platform_admin">platform_admin</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="deactivated" defaultChecked={user.deactivated ?? false} />
                      Deactivate
                    </label>
                    <button type="submit" className="text-blue-600 hover:underline text-xs">
                      Save
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
