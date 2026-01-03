import { Sidebar } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  )
}
