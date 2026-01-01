"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, BookOpen, ChevronDown, GraduationCap, LineChart, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { ShellNavItem } from "@/components/shell/ShellNavItem"
import { Logo } from "@/components/ui/Logo"
import { cn } from "@/lib/utils"

const ecgItems = [
  {
    label: "Practice",
    href: "/ecg/practice",
    icon: Activity,
    matchPaths: ["/ecg/practice"],
  },
  {
    label: "Cases",
    href: "/ecg/cases",
    icon: BookOpen,
    matchPaths: ["/ecg/cases"],
    isPro: true,
  },
]

const navItems = [
  {
    label: "Progress",
    href: "/progress",
    icon: LineChart,
  },
  {
    label: "Learn",
    href: "/learn",
    icon: GraduationCap,
    isPro: true,
  },
]

export function ShellSidebar() {
  const pathname = usePathname() || ""
  const isEcgActive = useMemo(
    () => pathname.startsWith("/ecg"),
    [pathname]
  )
  const [isEcgOpen, setIsEcgOpen] = useState(isEcgActive)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (isEcgActive && !isCollapsed) {
      setIsEcgOpen(true)
    }
  }, [isEcgActive, isCollapsed])

  return (
    <aside
      className={cn(
        "flex h-full flex-shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-sm transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-[240px]"
      )}
    >
      <div className="flex h-20 items-center border-b border-slate-200/80 px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <Logo width={100} height={28} />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none",
            isCollapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-6 overflow-y-auto overflow-x-hidden">
        {/* ECG Dropdown */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => !isCollapsed && setIsEcgOpen((open) => !open)}
            className={cn(
              "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isEcgActive
                ? "bg-slate-50 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
            title={isCollapsed ? "ECG Workbench" : undefined}
          >
            <span className="flex items-center gap-3 overflow-hidden">
              <Activity className={cn("h-4.5 w-4.5 shrink-0 transition-colors", isEcgActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
              <span className={cn("truncate transition-opacity duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>
                ECG Workbench
              </span>
            </span>
            {!isCollapsed && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 opacity-100",
                  isEcgOpen ? "rotate-180 text-slate-700" : "text-slate-400"
                )}
              />
            )}
          </button>

          <AnimatePresence initial={false}>
            {isEcgOpen && !isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden pl-2"
              >
                <div className="space-y-1 border-l-2 border-slate-100 pl-2">
                  {ecgItems.map((item) => (
                    <ShellNavItem key={item.href} {...item} isCollapsed={isCollapsed} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Other Sections (Progress, Learn) */}
        {navItems.map((item) => (
          <div key={item.href} title={isCollapsed ? item.label : undefined}>
            <ShellNavItem {...item} isCollapsed={isCollapsed} />
          </div>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="border-t border-slate-200/80 px-6 py-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Workspace</p>
          <div className="mt-2 text-xs text-slate-500">Secure Environment</div>
        </div>
      )}
    </aside>
  )
}
