"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Activity, Menu, User as UserIcon, LogOut, Bug } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const studentNav = [{ title: "ECG Simulation", href: "/ecg/practice", icon: Activity }]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [bugDetails, setBugDetails] = useState("")

  return (
    <aside
      className={cn(
        "h-screen border-r border-border bg-card/60 backdrop-blur-sm p-4 flex flex-col transition-all duration-200",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="mb-6 flex items-center gap-2 px-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="border-border/60 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </Button>
        {!isCollapsed && (
          <Image src="/images/logo_black.svg" alt="MedLab Logo" width={100} height={32} />
          
          
        )}
      </div>

      <div>
        <NavSection title="Tools" items={studentNav} pathname={pathname} collapsed={isCollapsed} />
      </div>

      <div className="mt-auto px-2 space-y-2">
        <Button
          type="button"
          variant="bug"
          className={cn(
            "w-full",
            isCollapsed ? "justify-center px-0" : "justify-start gap-3"
          )}
          onClick={() => setShowBugReport(true)}
        >
          <Bug className="h-4 w-4" />
          {!isCollapsed && <span className="font-medium">Report a bug</span>}
        </Button>
        <Button
          type="button"
          variant="default"
          className={cn(
            "w-full",
            isCollapsed ? "justify-center px-0" : "justify-start gap-3"
          )}
          onClick={() => setShowAccount(true)}
        >
          <UserIcon className="h-4 w-4" />
          {!isCollapsed && <span className="font-medium">Account</span>}
        </Button>
      </div>

      <Dialog open={showAccount} onOpenChange={setShowAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>View your profile and sign out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">Name</span>
              <span className="font-medium">{user?.name || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">Email</span>
              <span className="font-medium">{user?.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">Role</span>
              <span className="font-medium capitalize">{user?.role || "—"}</span>
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            <Button variant="default" onClick={() => setShowAccount(false)}>
              Close
            </Button>
            <LogoutButton />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBugReport} onOpenChange={setShowBugReport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a bug</DialogTitle>
            <DialogDescription>Describe the issue and we’ll forward it to the team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="What happened? Steps to reproduce, screenshots/URLs if relevant."
              value={bugDetails}
              onChange={(e) => setBugDetails(e.target.value)}
            />
          </div>
          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            <Button variant="ghost" onClick={() => setShowBugReport(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const mailto = `mailto:nikolozchovelidze01@gmail.com?subject=${encodeURIComponent("MedLab Bug Report")}&body=${encodeURIComponent(bugDetails || "")}`
                window.location.href = mailto
              }}
              disabled={!bugDetails.trim()}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

function NavSection({
  title,
  items,
  pathname,
  collapsed,
}: {
  title: string
  items: NavItem[]
  pathname: string | null
  collapsed: boolean
}) {
  return (
    <div className="space-y-2">
      {!collapsed && (
        <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </div>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors border-2 border-transparent border-b-4 active:border-b-2",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span className="font-medium">{item.title}</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function LogoutButton() {
  const { logout } = useAuth()

  return (
    <Button variant="destructive" onClick={logout} className="inline-flex items-center gap-2">
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  )
}
