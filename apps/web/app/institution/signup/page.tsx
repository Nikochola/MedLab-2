import { redirect } from "next/navigation"
import { buildMarketingUrl } from "@/lib/runtimeUrls"

export default function InstitutionSignupRedirectPage() {
  redirect(buildMarketingUrl("/institutions?requestAccess=1"))
}
