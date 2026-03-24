"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House,
  Stethoscope,
  ChartLineUp,
  Books,
  UserCircle,
  SquaresFour,
  Users,
  ClipboardText,
  ChartBar,
} from "@phosphor-icons/react"
import { useAuth } from "@/contexts/AuthContext"

// Per-tab accent colors — playful, Duolingo-inspired
const TAB_COLORS: Record<string, { icon: string; bg: string; border: string }> = {
  Learn:       { icon: "#0066FF", bg: "#EEF3FF", border: "#C7D9FF" },
  Simulate:    { icon: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  Simulations: { icon: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  Progress:    { icon: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  Resources:   { icon: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  Profile:     { icon: "#DB2777", bg: "#FDF2F8", border: "#FBCFE8" },
  Dashboard:   { icon: "#0066FF", bg: "#EEF3FF", border: "#C7D9FF" },
  Students:    { icon: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  Assignments: { icon: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  Analytics:   { icon: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
}

const independentStudentNav = [
  { label: "Learn",     href: "/learn",     icon: House },
  { label: "Simulate",  href: "/ecg",       icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Progress",  href: "/progress",  icon: ChartLineUp },
  { label: "Resources", href: "/more",      icon: Books },
]

const institutionStudentNav = [
  { label: "Learn",     href: "/learn",     icon: House },
  { label: "Simulate",  href: "/ecg",       icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Progress",  href: "/progress",  icon: ChartLineUp },
  { label: "Resources", href: "/more",      icon: Books },
]

const educatorNav = [
  { label: "Dashboard",   href: "/institution/courses", icon: SquaresFour },
  { label: "Students",    href: "/institution/courses", icon: Users },
  { label: "Assignments", href: "/practice",            icon: ClipboardText },
  { label: "Simulations", href: "/ecg",                 icon: Stethoscope, matchPaths: ["/ecg", "/xray"] },
  { label: "Analytics",   href: "/institution/courses", icon: ChartBar },
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
  icon: React.ComponentType<{ size?: number; weight?: string; style?: React.CSSProperties }>
  matchPaths?: string[]
}

function BottomBarItem({ href, label, icon: Icon, matchPaths }: BottomBarItemProps) {
  const pathname = usePathname() || ""
  const paths = matchPaths ?? [href]
  const isActive = paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const accent = TAB_COLORS[label] ?? TAB_COLORS["Learn"]

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center flex-1 py-2 gap-1"
    >
      <div
        className="flex items-center justify-center rounded-xl transition-all"
        style={{
          width: 44,
          height: 36,
          backgroundColor: isActive ? accent.bg : "transparent",
          border: isActive ? `1.5px solid ${accent.border}` : "1.5px solid transparent",
        }}
      >
        {/* @ts-ignore phosphor weight prop */}
        <Icon
          size={22}
          weight={isActive ? "fill" : "regular"}
          style={{ color: isActive ? accent.icon : "#9B9A94" }}
        />
      </div>
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ color: isActive ? accent.icon : "#9B9A94" }}
      >
        {label}
      </span>
    </Link>
  )
}

function ProfileBottomItem({ avatarUrl, userId }: { avatarUrl?: string | null; userId?: string }) {
  const pathname = usePathname() || ""
  const isActive = pathname === "/profile" || pathname.startsWith("/profile/")
  const imgSrc = avatarUrl || (userId ? defaultAvatarUrl(userId) : null)
  const accent = TAB_COLORS["Profile"]

  return (
    <Link
      href="/profile"
      className="flex flex-col items-center justify-center flex-1 py-2 gap-1"
    >
      <div
        className="flex items-center justify-center rounded-xl transition-all"
        style={{
          width: 44,
          height: 36,
          backgroundColor: isActive ? accent.bg : "transparent",
          border: isActive ? `1.5px solid ${accent.border}` : "1.5px solid transparent",
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="Profile"
            className="rounded-lg"
            width={22}
            height={22}
          />
        ) : (
          <UserCircle
            size={22}
            // @ts-ignore
            weight={isActive ? "fill" : "regular"}
            style={{ color: isActive ? accent.icon : "#9B9A94" }}
          />
        )}
      </div>
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ color: isActive ? accent.icon : "#9B9A94" }}
      >
        Profile
      </span>
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
        paddingBottom: "env(safe-area-inset-bottom)",
        minHeight: 64,
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
