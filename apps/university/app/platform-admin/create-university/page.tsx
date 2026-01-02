import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

async function requirePlatformAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    redirect("/login")
  }

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

async function createUniversityAction(formData: FormData) {
  "use server"
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "platform_admin") {
    redirect("/")
  }

  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const slugInput = (formData.get("slug") as string | null)?.trim() ?? ""
  const slug =
    slugInput ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

  if (!name || !slug) {
    redirect(`/platform-admin/create-university?error=${encodeURIComponent("Name and slug are required")}`)
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug, status: "active" })
    .select("*")
    .maybeSingle()

  if (orgError || !org) {
    redirect(`/platform-admin/create-university?error=${encodeURIComponent(orgError?.message ?? "Failed to create org")}`)
  }

  const { error: memberError } = await supabase
    .from("org_members")
    .upsert({ org_id: org.id, user_id: user.id, role: "org_admin" })

  if (memberError) {
    redirect(`/platform-admin/create-university?error=${encodeURIComponent(memberError.message)}`)
  }

  revalidatePath("/platform-admin")
  redirect("/platform-admin")
}

export default async function CreateUniversityPage({ searchParams }: { searchParams?: { error?: string } }) {
  const profile = await requirePlatformAdmin()
  const error = searchParams?.error

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Platform Admin</p>
          <h1 className="text-3xl font-bold">Create university</h1>
          <p className="text-muted-foreground mt-2">Adds an organization and makes you org admin.</p>
          <p className="text-sm text-muted-foreground mt-1">Signed in as {profile.name}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={createUniversityAction} className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              University name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-input bg-white px-3 py-2"
              placeholder="Example Medical University"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="slug">
              Slug (optional)
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              className="w-full rounded-lg border border-input bg-white px-3 py-2"
              placeholder="example-med"
            />
            <p className="text-xs text-muted-foreground">Used in URLs. Will be generated from name if left empty.</p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create university
          </button>
        </form>
      </div>
    </div>
  )
}
