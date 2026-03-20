import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SharedNavbar } from "@/components/sections/SharedNavbar"
import { SharedFooter } from "@/components/sections/SharedFooter"

export default function NotFound() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SharedNavbar />

      <div className="flex flex-col items-center justify-center flex-1 text-center" style={{ padding: "80px" }}>
        <p style={{ fontSize: 120, fontWeight: 700, color: "#E8E6DF", letterSpacing: "-0.06em", lineHeight: 1, margin: 0 }}>
          404
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0E0F12", letterSpacing: "-0.03em", margin: "8px 0 12px" }}>
          Page not found
        </h1>
        <p style={{ fontSize: 15, color: "#9B9A94", margin: "0 0 32px" }}>
          This page doesn't exist or was moved.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      <SharedFooter />
    </div>
  )
}
