import { Suspense } from "react"
import { headers } from "next/headers"

import LoginForm from "@/components/auth/LoginForm"
import { supabaseAdmin, hasSupabaseServiceRole } from "@/server/supabaseAdmin"

const MAIN_DOMAIN = "medlabinteractive.com"

function getSubdomainSlug(rawHost: string): string | null {
  const host = rawHost.split(":")[0]
  if (!host.endsWith(`.${MAIN_DOMAIN}`)) return null
  const sub = host.slice(0, -(`.${MAIN_DOMAIN}`.length))
  if (!sub || sub === "www" || sub === "app") return null
  return sub
}

async function getInstitutionBySlug(slug: string) {
  if (!hasSupabaseServiceRole) return null
  const { data } = await supabaseAdmin
    .from("institutions")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle()
  return data
}

export default async function InstitutionLoginPage() {
  const host = headers().get("host") || ""
  const slug = getSubdomainSlug(host)

  let institutionName: string | undefined
  if (slug) {
    const institution = await getInstitutionBySlug(slug)
    institutionName = institution?.name ?? undefined
  }

  return (
    <Suspense>
      <LoginForm
        type="institution"
        institutionName={institutionName}
        onSubdomain={Boolean(slug)}
      />
    </Suspense>
  )
}
