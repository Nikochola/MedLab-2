"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"

export function PortalTheme() {
  const { user } = useAuth()

  useEffect(() => {
    const role = user?.role === "teacher" ? "teacher" : "student"
    document.body.dataset.portal = role
    document.documentElement.dataset.portal = role
    return () => {
      delete document.body.dataset.portal
      delete document.documentElement.dataset.portal
    }
  }, [user?.role])

  return null
}
