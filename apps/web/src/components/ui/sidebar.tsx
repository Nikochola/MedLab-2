"use client"

import { Logo } from "@/components/ui/Logo"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Activity, User as UserIcon, LogOut, Bug, GraduationCap, ShoppingBag, MoreHorizontal } from "lucide-react"
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

const studentNav = [
  { title: "Learn", href: "/learn", icon: GraduationCap },
  { title: "Practice", href: "/practice", icon: Activity },
  { title: "Shop", href: "/shop", icon: ShoppingBag },
  { title: "Profile", href: "/profile", icon: UserIcon },
  { title: "More", href: "/more", icon: MoreHorizontal },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [showAccount, setShowAccount] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [bugDetails, setBugDetails] = useState("")

  return (
    <aside className="w-64 h-screen border-r-2 border-[#e5e5e5] bg-white p-4 flex flex-col transition-all duration-200">
      <div className="mb-6 flex items-center gap-2 px-4 mt-2">
        <Logo width={110} height={32} />
      </div>

      <div>
        <NavSection title="Menu" items={studentNav} pathname={pathname} />
      </div>

      <div className="mt-auto px-2 space-y-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => setShowBugReport(true)}
        >
          <Bug className="h-4 w-4" />
          <span className="font-medium">Report a bug</span>
        </Button>
        <Button
          type="button"
          variant="default"
          className="w-full justify-start gap-3"
          onClick={() => setShowAccount(true)}
        >
          <UserIcon className="h-4 w-4" />
          <span className="font-medium">Account</span>
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
}: {
  title: string
  items: NavItem[]
  pathname: string | null
}) {
  return (
    <div className="space-y-2">
      <div className="px-4 py-2 text-[13px] font-bold tracking-widest text-[#afafaf] uppercase mb-1">
        {title}
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-bold uppercase tracking-wide transition-all duration-150 border-2 border-transparent",
                isActive
                  ? "bg-[#ddf4ff] text-[#1cb0f6] border-[#84d8ff]"
                  : "text-[#afafaf] hover:bg-[#f7f7f7] hover:text-[#777]"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? "text-[#1cb0f6]" : "text-[#afafaf]")} />
              <span>{item.title}</span>
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
