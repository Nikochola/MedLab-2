import { cookies } from "next/headers"
import { redirect } from "next/navigation"

interface OrgLandingPageProps {
  params: { slug: string }
}

export default function OrgLandingPage({ params }: OrgLandingPageProps) {
  const store = cookies()
  store.set("medlab_org", params.slug, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  })

  redirect("/login")
}
