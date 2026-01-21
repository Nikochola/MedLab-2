"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Activity,
  LayoutPanelLeft,
  Users,
  Menu,
  User as UserIcon,
  LogOut,
  Bug,
  BookOpen,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
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

const studentNav: NavItem[] = []

const teacherNav = [{ title: "Students & Analytics", href: "/teacher/dashboard", icon: Users }]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isTeacher = user?.role === "teacher"
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [bugDetails, setBugDetails] = useState("")
  const [bugScreenshot, setBugScreenshot] = useState<File | null>(null)
  const [bugStatus, setBugStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [progress, setProgress] = useState<{
    simulations: number
    cases: number
    minutes: number
    lastActivity: string | null
  } | null>(null)
  const [classroomInfo, setClassroomInfo] = useState<{
    name: string | null
    code: string | null
    teacher: string | null
  } | null>(null)

  const accountRef = useRef<HTMLDivElement | null>(null)
  const modeParam = searchParams?.get("mode")
  const currentMode = modeParam === "case-based" ? "case-based" : "simulation"
  const showModeSwitcher = Boolean(user)
  const modeBase = isTeacher ? "/teacher/simulations" : "/ecg"
  const modeItems = showModeSwitcher
    ? [
        {
          title: "Simulation Lab",
          href: `${modeBase}?mode=simulation`,
          icon: Activity,
          isActive: currentMode === "simulation",
        },
        {
          title: "Clinical Cases",
          href: `${modeBase}?mode=case-based`,
          icon: BookOpen,
          isActive: currentMode === "case-based",
        },
      ]
    : []

  useEffect(() => {
    if (!user) {
      setProgress(null)
      setClassroomInfo(null)
      return
    }

    let isActive = true
    const load = async () => {
      if (user.role === "student") {
        const { data: progressRow } = await supabase
          .from("student_progress")
          .select("simulations_completed, cases_completed, total_time_spent, last_activity, classroom_id")
          .eq("student_id", user.id)
          .maybeSingle()

        const classroomId = (progressRow?.classroom_id as string | null) ?? user.classroomId ?? null
        if (isActive) {
          setProgress({
            simulations: progressRow?.simulations_completed ?? 0,
            cases: progressRow?.cases_completed ?? 0,
            minutes: Math.round((progressRow?.total_time_spent ?? 0) / 60),
            lastActivity: progressRow?.last_activity ?? null,
          })
        }

        if (classroomId) {
          const { data: classroom } = await supabase
            .from("classrooms")
            .select("name, code, teacher_id")
            .eq("id", classroomId)
            .maybeSingle()

          let teacherName: string | null = null
          if (classroom?.teacher_id) {
            const { data: teacher } = await supabase
              .from("users")
              .select("name, email")
              .eq("id", classroom.teacher_id)
              .maybeSingle()
            teacherName = (teacher?.name as string | null) ?? (teacher?.email as string | null) ?? null
          }

          if (isActive) {
            if (classroom) {
              setClassroomInfo({
                name: (classroom?.name as string | null) ?? null,
                code: (classroom?.code as string | null) ?? null,
                teacher: teacherName,
              })
            } else {
              setClassroomInfo(null)
            }
          }
        } else if (isActive) {
          setClassroomInfo(null)
        }
      } else if (user.role === "teacher") {
        const { data: classroom } = await supabase
          .from("classrooms")
          .select("name, code")
          .eq("teacher_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
        if (isActive) {
          if (classroom) {
            setClassroomInfo({
              name: (classroom?.name as string | null) ?? null,
              code: (classroom?.code as string | null) ?? null,
              teacher: null,
            })
          } else {
            setClassroomInfo(null)
          }
        }
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [user?.id, user?.role, user?.classroomId])

  useEffect(() => {
    if (!showAccount) return
    const handleClick = (event: MouseEvent) => {
      if (!accountRef.current) return
      if (!accountRef.current.contains(event.target as Node)) {
        setShowAccount(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAccount(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [showAccount])

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen border-r border-border/70 portal-sidebar backdrop-blur-sm p-4 flex flex-col transition-all duration-200",
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
        {(!isTeacher || !user) && studentNav.length > 0 && (
          <NavSection title="Tools" items={studentNav} pathname={pathname} collapsed={isCollapsed} />
        )}
        {isTeacher && teacherNav.length > 0 && (
          <NavSection title="Tools" items={teacherNav} pathname={pathname} collapsed={isCollapsed} />
        )}
        {modeItems.length > 0 && (
          <NavSection title="ECG" items={modeItems} pathname={pathname} collapsed={isCollapsed} />
        )}
        {!isCollapsed && user?.role === "student" && (
          <div className="portal-surface mt-4 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              My Progress
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/70 bg-white/80 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Simulations</div>
                <div className="text-sm font-semibold">{progress?.simulations ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-white/80 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Cases</div>
                <div className="text-sm font-semibold">{progress?.cases ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-white/80 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Minutes</div>
                <div className="text-sm font-semibold">{progress?.minutes ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-white/80 px-2 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Last active</div>
                <div className="text-sm font-semibold">
                  {progress?.lastActivity ? new Date(progress.lastActivity).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto px-2 space-y-2">
        <Button
          type="button"
          variant="bug"
          className={cn(
            "w-full",
            isCollapsed ? "justify-center px-0" : "justify-start gap-3"
          )}
          onClick={() => {
            setShowAccount(false)
            setShowBugReport(true)
          }}
        >
          <Bug className="h-4 w-4" />
          {!isCollapsed && <span className="font-medium">Report a bug</span>}
        </Button>
        <div ref={accountRef} className={cn("relative w-full", isCollapsed && "flex justify-center")}>
          <Button
            type="button"
            variant="default"
            aria-expanded={showAccount}
            className={cn(
              "w-full",
              isCollapsed ? "justify-center px-0" : "justify-start gap-3"
            )}
            onClick={() => setShowAccount((prev) => !prev)}
          >
            <UserIcon className="h-4 w-4" />
            {!isCollapsed && <span className="font-medium">Account</span>}
          </Button>
          {showAccount && (
            <div
              className={cn(
                "absolute z-50 portal-surface p-4 text-sm",
                isCollapsed ? "left-full bottom-0 ml-3 w-72" : "left-0 right-0 bottom-full mb-3"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Account</div>
                  <button
                    type="button"
                    aria-label="Close account menu"
                    className="rounded-full p-1 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                    onClick={() => setShowAccount(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] uppercase text-muted-foreground">Name</div>
                    <div className="font-medium break-words">{user?.name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-muted-foreground">Email</div>
                    <div className="font-medium break-all">{user?.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-muted-foreground">Role</div>
                    <div className="font-medium capitalize">{user?.role || "—"}</div>
                  </div>
                  {classroomInfo && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-[11px] uppercase text-muted-foreground">Classroom</div>
                      <div className="font-medium break-words">{classroomInfo.name || "—"}</div>
                      {classroomInfo.code && (
                        <div className="text-xs text-muted-foreground">Code: {classroomInfo.code}</div>
                      )}
                      {classroomInfo.teacher && (
                        <div className="text-xs text-muted-foreground">Teacher: {classroomInfo.teacher}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <LogoutButton />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
              disabled={bugStatus === "sending"}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Screenshot (optional)</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                onChange={(event) => setBugScreenshot(event.target.files?.[0] ?? null)}
                disabled={bugStatus === "sending"}
              />
              {bugScreenshot && (
                <p className="text-xs text-muted-foreground">Attached: {bugScreenshot.name}</p>
              )}
            </div>
            {bugStatus === "sent" && (
              <p className="text-xs text-green-600">Report sent. Thank you!</p>
            )}
            {bugStatus === "error" && (
              <p className="text-xs text-red-600">Could not send report. Please try again.</p>
            )}
          </div>
          <DialogFooter className="flex flex-row justify-end sm:justify-end">
            <Button
              variant="outline"
              onClick={async () => {
                if (!bugDetails.trim() || bugStatus === "sending") return
                setBugStatus("sending")
                try {
                  const formData = new FormData()
                  formData.append("message", bugDetails.trim())
                  formData.append("url", window.location.href)
                  formData.append("userAgent", navigator.userAgent)
                  if (user) {
                    formData.append(
                      "user",
                      JSON.stringify({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                      })
                    )
                  }
                  if (bugScreenshot) {
                    formData.append("screenshot", bugScreenshot, bugScreenshot.name)
                  }
                  const res = await fetch("/api/bug-report", {
                    method: "POST",
                    body: formData,
                  })
                  if (!res.ok) {
                    throw new Error("Bug report failed")
                  }
                  setBugDetails("")
                  setBugScreenshot(null)
                  setBugStatus("sent")
                  setTimeout(() => setBugStatus("idle"), 2500)
                } catch (error) {
                  console.error(error)
                  setBugStatus("error")
                }
              }}
              disabled={!bugDetails.trim() || bugStatus === "sending"}
            >
              {bugStatus === "sent" ? "Sent" : bugStatus === "sending" ? "Sending..." : "Send"}
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
  isActive?: boolean
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
          const isActive = item.isActive ?? pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm portal-nav-item",
                isActive
                  ? "portal-nav-active"
                  : ""
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
