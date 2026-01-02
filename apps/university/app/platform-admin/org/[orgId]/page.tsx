import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer"
import { getOrganizationById, getEntitlementsForOrg, getSubscriptionsForOrg } from "@/lib/orgs"
import { logoutAction } from "@/app/actions/auth"

function Info({ hint }: { hint: string }) {
  return (
    <span className="relative inline-flex align-middle group">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
        {hint}
      </span>
    </span>
  )
}

async function requirePlatformAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("users").select("role, name").eq("id", user.id).maybeSingle()
  if (profile?.role !== "platform_admin") redirect("/")
  return { user, profile }
}

async function updateOrgProfile(formData: FormData) {
  "use server"
  const supabase = createSupabaseServerClient()
  const { user, profile } = await requirePlatformAdmin()

  const orgId = formData.get("orgId") as string
  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const slug = (formData.get("slug") as string | null)?.trim() ?? ""
  const seatLimitRaw = formData.get("seat_limit") as string
  const seatLimit = seatLimitRaw ? parseInt(seatLimitRaw, 10) : null
  const status = (formData.get("status") as string) || "active"
  const ownerUserId = (formData.get("owner_user_id") as string | null)?.trim() || null
  const contactEmail = (formData.get("contact_email") as string | null) ?? null
  const domain = (formData.get("domain") as string | null) ?? null
  const subdomain = (formData.get("subdomain") as string | null) ?? null

  await supabase
    .from("organizations")
    .update({
      name,
      slug,
      seat_limit: seatLimit,
      status,
      owner_user_id: ownerUserId,
      contact_email: contactEmail,
      domain,
      subdomain,
    })
    .eq("id", orgId)

  await supabase.from("platform_audit").insert({
    actor_user_id: user.id,
    actor_role: profile.role,
    org_id: orgId,
    action: "org_profile_update",
    target_type: "organization",
    target_id: orgId,
    metadata: { name, slug, seatLimit, status, ownerUserId, contactEmail, domain, subdomain },
  })

  revalidatePath(`/platform-admin/org/${orgId}`)
  redirect(`/platform-admin/org/${orgId}?saved=1`)
}

async function updateEntitlements(formData: FormData) {
  "use server"
  const supabaseAdmin = createSupabaseAdminClient()
  const { user, profile } = await requirePlatformAdmin()

  const orgId = formData.get("orgId") as string
  const ecg = formData.get("ecg_practice") === "on"
  const cases = formData.get("cases") === "on"
  const analytics = formData.get("analytics") === "on"
  const aiFeedback = formData.get("ai_feedback") === "on"
  const attemptsRaw = formData.get("attempts_per_day") as string
  const attemptsPerDay = attemptsRaw ? parseInt(attemptsRaw, 10) : null
  const seatsRaw = formData.get("seats") as string
  const seats = seatsRaw ? parseInt(seatsRaw, 10) : null
  const { data: existing } = await supabaseAdmin.from("entitlements").select("*").eq("org_id", orgId).maybeSingle()
  const cohortsEnabled = existing?.cohorts_enabled ?? true
  const betaAccess = existing?.beta_access ?? false
  const payload = {
    org_id: orgId,
    ecg_practice: ecg,
    cases,
    analytics,
    ai_feedback: aiFeedback,
    attempts_per_day: attemptsPerDay,
    seats,
    cohorts_enabled: cohortsEnabled,
    beta_access: betaAccess,
  }

  let upsertError: { message?: string } | null = null
  const { error: adminErr } = await supabaseAdmin.from("entitlements").upsert(payload, { onConflict: "org_id" })
  if (adminErr) {
    console.error("entitlements upsert (admin) failed", adminErr)
    const supabaseUser = createSupabaseServerClient()
    const { error: userErr } = await supabaseUser.from("entitlements").upsert(payload, { onConflict: "org_id" })
    if (userErr) {
      console.error("entitlements upsert (user) failed", userErr)
      upsertError = userErr
    }
  }

  const supabaseAudit = createSupabaseServerClient()
  await supabaseAudit.from("platform_audit").insert({
    actor_user_id: user.id,
    actor_role: profile.role,
    org_id: orgId,
    action: "entitlements_update",
    target_type: "organization",
    target_id: orgId,
    metadata: { ecg, cases, analytics, ai_feedback: aiFeedback, attempts_per_day: attemptsPerDay, seats },
  })

  if (upsertError) {
    const reason = encodeURIComponent(upsertError.message || "unknown")
    redirect(`/platform-admin/org/${orgId}?error=entitlements&reason=${reason}`)
  }

  revalidatePath(`/platform-admin/org/${orgId}`)
  redirect(`/platform-admin/org/${orgId}?saved=1`)
}

async function updateSubscription(formData: FormData) {
  "use server"
  const supabaseAdmin = createSupabaseAdminClient()
  const { user, profile } = await requirePlatformAdmin()

  const orgId = formData.get("orgId") as string
  const statusRaw = (formData.get("status") as string) || "active"
  const plan = (formData.get("plan") as string) || null
  const seatLimitRaw = formData.get("seat_limit") as string
  const seatLimit = seatLimitRaw ? parseInt(seatLimitRaw, 10) : null
  const isLifetime = statusRaw === "lifetime" ? true : formData.get("is_lifetime") === "on"
  const allowedStatuses = ["trialing", "active", "past_due", "canceled"]
  const status = statusRaw === "lifetime" ? "active" : allowedStatuses.includes(statusRaw) ? statusRaw : "active"

  const subPayload = {
    org_id: orgId,
    status,
    plan,
    seat_limit: seatLimit,
    is_lifetime: isLifetime,
  }

  let subError: { message?: string } | null = null
  const { data: existingSub, error: existingErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let adminErr = existingErr
  if (!existingErr) {
    if (existingSub?.id) {
      const { error } = await supabaseAdmin.from("subscriptions").update(subPayload).eq("id", existingSub.id)
      adminErr = error
    } else {
      const { error } = await supabaseAdmin.from("subscriptions").insert(subPayload)
      adminErr = error
    }
  }

  if (adminErr) {
    console.error("subscription write (admin) failed", adminErr)
    const supabase = createSupabaseServerClient()
    const { data: userSub, error: userErr } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (userErr) {
      console.error("subscription lookup (user) failed", userErr)
      subError = userErr
    } else if (userSub?.id) {
      const { error } = await supabase.from("subscriptions").update(subPayload).eq("id", userSub.id)
      if (error) {
        console.error("subscription update (user) failed", error)
        subError = error
      }
    } else {
      const { error } = await supabase.from("subscriptions").insert(subPayload)
      if (error) {
        console.error("subscription insert (user) failed", error)
        subError = error
      }
    }
  }

  const supabaseAudit = createSupabaseServerClient()
  await supabaseAudit.from("platform_audit").insert({
    actor_user_id: user.id,
    actor_role: profile.role,
    org_id: orgId,
    action: "subscription_update",
    target_type: "organization",
    target_id: orgId,
    metadata: { status, plan, seatLimit, isLifetime },
  })

  if (subError) {
    const reason = encodeURIComponent(subError.message || "unknown")
    redirect(`/platform-admin/org/${orgId}?error=subscription&reason=${reason}`)
  }

  revalidatePath(`/platform-admin/org/${orgId}`)
  redirect(`/platform-admin/org/${orgId}?saved=1`)
}

async function deleteOrganization(formData: FormData) {
  "use server"
  const supabase = createSupabaseAdminClient()
  const { user, profile } = await requirePlatformAdmin()
  const orgId = formData.get("orgId") as string
  const orgSlug = (formData.get("orgSlug") as string | null) ?? ""
  const confirmValue = (formData.get("confirm") as string | null)?.trim() ?? ""
  const confirmEmail = (formData.get("confirm_email") as string | null)?.trim().toLowerCase() ?? ""
  const confirmDelete = (formData.get("confirm_delete") as string | null)?.trim().toUpperCase() ?? ""

  if (!orgId || !orgSlug || confirmValue !== orgSlug || confirmEmail !== user.email?.toLowerCase() || confirmDelete !== "DELETE") {
    throw new Error("Confirmation does not match")
  }

  await supabase.from("organizations").delete().eq("id", orgId)

  await supabase.from("platform_audit").insert({
    actor_user_id: user.id,
    actor_role: profile.role,
    org_id: orgId,
    action: "org_delete",
    target_type: "organization",
    target_id: orgId,
    metadata: { slug: orgSlug },
  })

  revalidatePath(`/platform-admin`)
  redirect("/platform-admin")
}

interface OrgSettingsPageProps {
  params: { orgId: string }
  searchParams?: { saved?: string; error?: string; reason?: string }
}

export default async function OrgSettingsPage({ params, searchParams }: OrgSettingsPageProps) {
  const admin = await requirePlatformAdmin()
  const { user } = admin
  const org = await getOrganizationById(params.orgId)
  if (!org) {
    redirect("/platform-admin")
  }
  const entitlements = await getEntitlementsForOrg(org.id)
  const subscriptions = await getSubscriptionsForOrg(org.id)
  const subscription = subscriptions[0]
  const saved = searchParams?.saved === "1"
  const error = searchParams?.error
  const reason = searchParams?.reason

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Platform Admin</p>
            <h1 className="text-3xl font-bold">{org.name}</h1>
            <p className="text-muted-foreground mt-2">Manage lifecycle, billing, and entitlements.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/account" className="text-blue-600 hover:underline">
              Account settings
            </Link>
            <form action={logoutAction}>
              <button className="text-red-600 hover:underline" type="submit">
                Sign out
              </button>
            </form>
            <Link href="/platform-admin" className="text-blue-600 hover:underline">
              ← Back to orgs
            </Link>
          </div>
        </div>

        {saved && !error && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            Changes saved.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            Could not save changes ({error}).{" "}
            {reason ? `Reason: ${decodeURIComponent(reason)}.` : "Check your Supabase keys (service role) and retry."}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Profile</h2>
            <form action={updateOrgProfile} className="space-y-2 text-sm">
              <input type="hidden" name="orgId" value={org.id} />
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1">
                  Name
                  <Info hint="University display name shown to users." />
                </span>
                <input
                  name="name"
                  defaultValue={org.name}
                  className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1">
                  Slug
                  <Info hint="Used in URLs, unique per org." />
                </span>
                <input
                  name="slug"
                  defaultValue={org.slug}
                  className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="inline-flex items-center gap-1">
                    Status
                    <Info hint="Lifecycle: trial/active/past due/suspended." />
                  </span>
                  <select
                    name="status"
                    defaultValue={org.status}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="trial">trial</option>
                    <option value="active">active</option>
                    <option value="past_due">past_due</option>
                    <option value="suspended">suspended</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="inline-flex items-center gap-1">
                    Seat limit
                    <Info hint="Max paid seats; leave blank for unlimited." />
                  </span>
                  <input
                    name="seat_limit"
                    type="number"
                    min="0"
                    defaultValue={org.seatLimit ?? ""}
                    className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1">
                  Owner user ID
                  <Info hint="Primary owner account for this org." />
                </span>
                <input
                  name="owner_user_id"
                  defaultValue={org.ownerUserId ?? ""}
                  className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1">
                  Contact email
                  <Info hint="Admin contact for billing/support notices." />
                </span>
                <input
                  name="contact_email"
                  type="email"
                  defaultValue={org.contactEmail ?? ""}
                  className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="inline-flex items-center gap-1">
                    Domain
                    <Info hint="Custom domain (optional)." />
                  </span>
                  <input
                    name="domain"
                    defaultValue={org.domain ?? ""}
                    className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="inline-flex items-center gap-1">
                    Subdomain
                    <Info hint="App-hosted subdomain (optional)." />
                  </span>
                  <input
                    name="subdomain"
                    defaultValue={org.subdomain ?? ""}
                    className="w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input type="checkbox" name="confirm_profile" required className="h-4 w-4 rounded border border-border" />
                  Confirm profile changes
                </label>
                <button type="submit" className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
                  Save profile
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Entitlements</h2>
            <form action={updateEntitlements} className="space-y-2 text-sm">
              <input type="hidden" name="orgId" value={org.id} />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "ecg_practice", label: "ECG Practice", checked: entitlements?.ecgPractice ?? true, hint: "Core ECG practice module access." },
                  { name: "cases", label: "ECG Cases", checked: entitlements?.cases ?? true, hint: "Case-based learning module access." },
                  { name: "analytics", label: "Analytics", checked: entitlements?.analytics ?? false, hint: "Org analytics dashboards." },
                  { name: "ai_feedback", label: "AI feedback", checked: entitlements?.aiFeedback ?? true, hint: "Allow AI hints/feedback for learners." },
                ].map((item) => (
                  <label key={item.name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name={item.name}
                      defaultChecked={item.checked}
                      className="h-4 w-4 rounded border border-border text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 appearance-none checked:bg-blue-600 checked:border-blue-600"
                    />
                    <span className="inline-flex items-center gap-1">
                      {item.label}
                      <Info hint={item.hint} />
                    </span>
                  </label>
                ))}
              </div>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1">
                  Attempts per day (0 = unlimited)
                  <Info hint="Daily attempt cap across modules; 0 disables the cap." />
                </span>
                <input
                  name="attempts_per_day"
                  type="number"
                  min="0"
                  defaultValue={entitlements?.attemptsPerDay ?? 0}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1">
                  Seats
                  <Info hint="Optional feature-level seat limit; overrides org seat limit if set." />
                </span>
                <input
                  name="seats"
                  type="number"
                  min="0"
                  defaultValue={entitlements?.seats ?? ""}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input type="checkbox" name="confirm_entitlements" required className="h-4 w-4 rounded border border-border" />
                  Confirm entitlement changes
                </label>
                <button type="submit" className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
                  Save entitlements
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Billing</h2>
          <form action={updateSubscription} className="grid gap-3 text-sm md:grid-cols-2">
            <input type="hidden" name="orgId" value={org.id} />
            <label className="block space-y-1">
              <span className="inline-flex items-center gap-1">
                Status
                <Info hint="Billing status; lifetime marks a comped account." />
              </span>
              <select
                name="status"
                defaultValue={subscription?.isLifetime ? "lifetime" : subscription?.status ?? "active"}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="trialing">trialing</option>
                <option value="active">active</option>
                <option value="past_due">past_due</option>
                <option value="canceled">canceled</option>
                <option value="lifetime">lifetime</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="inline-flex items-center gap-1">
                Plan
                <Info hint="Plan ID from billing provider (optional placeholder)." />
              </span>
              <input
                name="plan"
                defaultValue={subscription?.plan ?? ""}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block space-y-1">
              <span className="inline-flex items-center gap-1">
                Seat limit
                <Info hint="Billing seat cap; leave blank for unlimited." />
              </span>
              <input
                name="seat_limit"
                type="number"
                min="0"
                defaultValue={subscription?.seatLimit ?? ""}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_lifetime"
                defaultChecked={subscription?.isLifetime ?? false}
                className="h-4 w-4 rounded border border-border text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 appearance-none checked:bg-blue-600 checked:border-blue-600"
              />
              <span className="inline-flex items-center gap-1">
                Lifetime / Comp
                <Info hint="Marks this subscription as free for life." />
              </span>
            </label>
            <div className="md:col-span-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input type="checkbox" name="confirm_subscription" required className="h-4 w-4 rounded border border-border" />
                Confirm subscription changes
              </label>
              <button type="submit" className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
                Save subscription
              </button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground">Polar integration and invoicing hooks can be wired to the plan/status fields later.</p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
          <p className="text-sm text-red-700">Deleting a university removes all memberships, cohorts, entitlements, and subscriptions. This cannot be undone.</p>
          <form action={deleteOrganization} className="space-y-2">
            <input type="hidden" name="orgId" value={org.id} />
            <input type="hidden" name="orgSlug" value={org.slug} />
            <label className="block text-sm font-medium text-red-700">
              Type the slug to confirm ({org.slug})
              <input
                name="confirm"
                required
                placeholder={org.slug}
                className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <label className="block text-sm font-medium text-red-700">
              Enter your email to confirm ({user.email ?? "your email"})
              <input
                name="confirm_email"
                type="email"
                required
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <label className="block text-sm font-medium text-red-700">
              Type DELETE to proceed
              <input
                name="confirm_delete"
                required
                placeholder="DELETE"
                className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete university
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
