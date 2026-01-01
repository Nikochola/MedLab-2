"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "teacher" | "student"
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to appropriate login based on path
      if (pathname?.startsWith("/teacher")) {
        router.push("/teacher/login")
      } else {
        router.push("/student/login")
      }
      return
    }

    // Check role-based access
    if (requiredRole && user?.role !== requiredRole) {
      // Redirect based on user role
      if (user?.role === "teacher") {
        router.push("/teacher/dashboard")
      } else {
        router.push("/ecg")
      }
    }
  }, [isAuthenticated, user, requiredRole, pathname, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Access denied. Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

