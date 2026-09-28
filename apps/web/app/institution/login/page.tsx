import { Suspense } from "react"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import LoginForm from "@/components/auth/LoginForm"
import { supabaseAdmin, hasSupabaseServiceRole } from "@/server/supabaseAdmin"
import { getInstitutionSubdomainSlug } from "@/lib/institutionDomains"
import { getServerSession } from "@/server/auth/session"
import { getCurrentInstitutionForUser } from "@/server/institution"

async function getInstitutionBySlug(slug: string) {
  if (!hasSupabaseServiceRole) return null
  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("id,name,slug,billing_plan,subdomain_enabled")
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) return null
  const plan = String(data.billing_plan || "STARTER").toUpperCase()
  if (!data.subdomain_enabled || (plan !== "GROWTH" && plan !== "ENTERPRISE")) return null
  let branding = null
  if (plan === "ENTERPRISE") {
    const { data: brandingData } = await supabaseAdmin.from("institution_branding").select("enabled,product_name,logo_url,primary_color,accent_color,hide_medlab_branding").eq("institution_id", data.id).maybeSingle()
    branding = brandingData?.enabled ? brandingData : null
  }
  return { ...data, branding }
}

export default async function InstitutionLoginPage() {
  const host = headers().get("host") || ""
  const slug = getInstitutionSubdomainSlug(host)

  let institutionName: string | undefined
  let institutionBranding: { name?: string; logoUrl: string | null; primaryColor: string; accentColor: string; hideMedlabBranding: boolean } | null = null
  if (slug) {
    const institution = await getInstitutionBySlug(slug)
    if (!institution) notFound()
    institutionName = institution?.name ?? undefined
    institutionBranding = institution.branding ? { name: institution.branding.product_name ? String(institution.branding.product_name) : institutionName, logoUrl: institution.branding.logo_url ? String(institution.branding.logo_url) : null, primaryColor: String(institution.branding.primary_color || "#0066FF"), accentColor: String(institution.branding.accent_color || "#EEF3FF"), hideMedlabBranding: Boolean(institution.branding.hide_medlab_branding) } : null
    const session = await getServerSession()
    if (session?.user?.id) {
      const context = await getCurrentInstitutionForUser(session.user.id)
      if (context && context.institution.id === institution.id) {
        redirect(context.membership.role === "STUDENT" ? "/learn" : "/institution/overview")
      }
    }
  }

  return (
    <Suspense>
      <LoginForm
        type="institution"
        institutionName={institutionName}
        onSubdomain={Boolean(slug)}
        institutionBranding={institutionBranding}
      />
    </Suspense>
  )
}
