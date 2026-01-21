import { Suspense } from "react"
import { Sidebar } from "@/components/ui/sidebar"
import { PortalTheme } from "@/components/ui/portal-theme"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex portal-canvas text-foreground overflow-hidden">
      <PortalTheme />
      <div className="hidden md:block shrink-0">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  )
}
