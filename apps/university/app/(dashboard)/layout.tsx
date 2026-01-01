import { Sidebar } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
