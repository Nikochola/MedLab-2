"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

const independentStudentNav = [
  { label: "Learn", href: "/learn", icon: Home },
  { label: "Simulate", href: "/ecg", icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Resources", href: "/more", icon: BookOpen },
]

const institutionStudentNav = [
  { label: "Learn", href: "/learn", icon: Home },
  { label: "Simulate", href: "/ecg", icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Resources", href: "/more", icon: BookOpen },
]

const educatorNav = [
  { label: "Dashboard", href: "/institution/courses", icon: LayoutDashboard },
  { label: "Students", href: "/institution/courses", icon: Users },
  { label: "Assignments", href: "/practice", icon: ClipboardList },
  { label: "Simulate", href: "/ecg", icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Analytics", href: "/institution/courses", icon: BarChart3 },
]

function getNavItems(role?: string, primaryRole?: string) {
  if (role === "educator" || role === "teacher" || role === "institution_admin" || role === "admin") {
    return educatorNav
  }
  if (primaryRole === "institution") return institutionStudentNav
  return independentStudentNav
}

function defaultAvatarUrl(userId: string) {
  return `https://api.dicebear.com/9.x/big-smile/svg?seed=${userId}&hair=shortHair&eyes=cheery&mouth=openedSmile&skinColor=efcc9f&hairColor=220f00&backgroundColor=EEF3FF&scale=90&radius=50&accessoriesProbability=0`
}

interface BottomBarItemProps {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  matchPaths?: string[]
}

function BottomBarItem({ href, label, icon: Icon, matchPaths }: BottomBarItemProps) {
  const pathname = usePathname() || ""
  const paths = matchPaths ?? [href]
  const isActive = paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors"
    >
      <Icon
        className="h-5 w-5"
        style={{ color: isActive ? "#0066FF" : "#9B9A94" }}
      />
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ color: isActive ? "#0066FF" : "#9B9A94" }}
      >
        {label}
      </span>
      {isActive && (
        <span
          className="absolute bottom-0 w-8 h-[3px] rounded-t-full"
          style={{ backgroundColor: "#0066FF" }}
        />
      )}
    </Link>
  )
}

function ProfileBottomItem({ avatarUrl, userId }: { avatarUrl?: string | null; userId?: string }) {
  const pathname = usePathname() || ""
  const isActive = pathname === "/profile" || pathname.startsWith("/profile/")
  const imgSrc = avatarUrl || (userId ? defaultAvatarUrl(userId) : null)

  return (
    <Link
      href="/profile"
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative transition-colors"
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt="Profile"
          className="rounded-md"
          width={22}
          height={22}
          style={{
            outline: isActive ? "2px solid #0066FF" : "2px solid transparent",
            outlineOffset: 1,
          }}
        />
      ) : (
        <UserCircle
          className="h-5 w-5"
          style={{ color: isActive ? "#0066FF" : "#9B9A94" }}
        />
      )}
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ color: isActive ? "#0066FF" : "#9B9A94" }}
      >
        Profile
      </span>
      {isActive && (
        <span
          className="absolute bottom-0 w-8 h-[3px] rounded-t-full"
          style={{ backgroundColor: "#0066FF" }}
        />
      )}
    </Link>
  )
}

export function ShellBottomBar() {
  const { user } = useAuth()
  const navItems = getNavItems(user?.role, user?.primary_role)
  const isEducator =
    user?.role === "educator" ||
    user?.role === "teacher" ||
    user?.role === "institution_admin" ||
    user?.role === "admin"

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch"
      style={{
        backgroundColor: "white",
        borderTop: "1px solid #E8E6DF",
        height: 64,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {navItems.map((item) => (
        <BottomBarItem key={item.label} {...item} />
      ))}
      {!isEducator && (
        <ProfileBottomItem avatarUrl={user?.avatarUrl} userId={user?.id} />
      )}
    </nav>
  )
}
