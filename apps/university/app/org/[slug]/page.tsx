import { redirect } from "next/navigation"

interface OrgLandingPageProps {
  params: { slug: string }
}

export default function OrgLandingPage({ params }: OrgLandingPageProps) {
  redirect("/login")
}
