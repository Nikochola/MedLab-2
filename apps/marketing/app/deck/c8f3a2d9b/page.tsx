import { redirect } from "next/navigation"

export default function DeckPage() {
  redirect("/medlab-pitch.pdf")
}

export const metadata = {
  robots: "noindex, nofollow",
}
