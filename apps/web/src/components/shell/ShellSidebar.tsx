"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  ClipboardList,
  Stethoscope,
  TrendingUp,
  BookOpen,
  UserCircle,
  LayoutDashboard,
  Users,
  BarChart3,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ShellNavItem } from "@/components/shell/ShellNavItem"

const independentStudentNav = [
  { label: "Learn", href: "/learn", icon: Home },
  { label: "Simulations", href: "/ecg", icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Resources", href: "/more", icon: BookOpen },
]

const institutionStudentNav = [
  { label: "Learn", href: "/learn", icon: Home },
  { label: "Simulations", href: "/ecg", icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Resources", href: "/more", icon: BookOpen },
]

const educatorNav = [
  { label: "Dashboard", href: "/institution/courses", icon: LayoutDashboard },
  { label: "Students", href: "/institution/courses", icon: Users },
  { label: "Assignments", href: "/practice", icon: ClipboardList },
  { label: "Simulations", href: "/ecg", icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Analytics", href: "/institution/courses", icon: BarChart3 },
]

function getNavItems(role?: string, primaryRole?: string): typeof independentStudentNav {
  if (role === "educator" || role === "teacher" || role === "institution_admin" || role === "admin") {
    return educatorNav
  }

  if (primaryRole === "institution") {
    return institutionStudentNav
  }

  return independentStudentNav
}

function defaultAvatarUrl(userId: string) {
  return `https://api.dicebear.com/9.x/big-smile/svg?seed=${userId}&hair=shortHair&eyes=cheery&mouth=openedSmile&skinColor=efcc9f&hairColor=220f00&backgroundColor=EEF3FF&scale=90&radius=50&accessoriesProbability=0`
}

function ProfileNavItem({ avatarUrl, userId }: { avatarUrl?: string | null; userId?: string }) {
  const pathname = usePathname() || ""
  const isActive = pathname === "/profile" || pathname.startsWith("/profile/")
  const imgSrc = avatarUrl || (userId ? defaultAvatarUrl(userId) : null)

  return (
    <Link
      href="/profile"
      className="group flex items-center justify-between rounded-[9px] px-4 py-3 text-[15px] font-medium transition-colors"
      style={{
        backgroundColor: isActive ? "#EEF3FF" : "transparent",
        border: isActive ? "1.5px solid #C7D9FF" : "1.5px solid transparent",
        color: isActive ? "#0066FF" : "#6B6A65",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "#F5F5F3"
          e.currentTarget.style.borderColor = "#E8E6DF"
          e.currentTarget.style.color = "#0E0F12"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent"
          e.currentTarget.style.borderColor = "transparent"
          e.currentTarget.style.color = "#6B6A65"
        }
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="Profile"
            className="shrink-0 rounded-md"
            width={28}
            height={28}
          />
        ) : (
          <UserCircle
            className="h-5 w-5 shrink-0"
            style={{ color: isActive ? "#0066FF" : "#9B9A94" }}
          />
        )}
        <span className="truncate">Profile</span>
      </div>
    </Link>
  )
}

// Routes to eagerly prefetch so the first click is instant.
const PREFETCH_ROUTES = ["/learn", "/practice", "/progress", "/more", "/profile", "/ecg", "/xray", "/journey", "/shop"]

export function ShellSidebar() {
  const { user } = useAuth()
  const router = useRouter()
  const navItems = getNavItems(user?.role, user?.primary_role)
  const isEducator = user?.role === "educator" || user?.role === "teacher" || user?.role === "institution_admin" || user?.role === "admin"

  useEffect(() => {
    PREFETCH_ROUTES.forEach((route) => router.prefetch(route))
  }, [router])

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: 240,
        backgroundColor: "white",
        borderRight: "1px solid #E8E6DF",
      }}
    >
      {/* Logo row */}
      <div className="flex items-center px-6" style={{ height: 72 }}>
        <Link href="/">
          <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 20 }} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <ShellNavItem key={item.label} {...item} isCollapsed={false} />
        ))}
        {!isEducator && <ProfileNavItem avatarUrl={user?.avatarUrl} userId={user?.id} />}
      </nav>
    </aside>
  )
}
