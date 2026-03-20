"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { User, UserRole } from "@/lib/types"

interface AuthContextType {
  isAuthenticated: boolean
  user: (User & { primary_role?: string }) | null
  isLoading: boolean
  isWorkbenchMode: boolean
  setWorkbenchMode: (val: boolean) => void
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_CACHE_KEY = "medlab_auth_user"

function readUserCache(): (User & { primary_role?: string }) | null {
  try {
    const cached = sessionStorage.getItem(USER_CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function writeUserCache(user: (User & { primary_role?: string }) | null) {
  try {
    if (user) {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    } else {
      sessionStorage.removeItem(USER_CACHE_KEY)
    }
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<(User & { primary_role?: string }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorkbenchMode, setIsWorkbenchMode] = useState(false)

  // showLoading=false for background revalidations so we don't flash a spinner
  // when we already have valid cached user data
  const refreshSession = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      setUser(null)
      writeUserCache(null)
      setIsLoading(false)
      return
    }

    const [profileRes, membershipRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("institution_memberships").select("role").eq("user_id", session.user.id).maybeSingle()
    ])

    const profile = profileRes.data
    const membership = membershipRes.data

    let appRole: UserRole = "student"
    if (membership?.role) {
      appRole = membership.role as UserRole
    }

    const newUser = {
      id: session.user.id,
      email: session.user.email!,
      name: profile?.full_name || profile?.name || session.user.email?.split("@")[0] || "User",
      role: appRole,
      primary_role: profile?.primary_role,
      classroomId: null,
      createdAt: profile?.created_at || session.user.created_at,
      avatarUrl: profile?.avatar_url || null,
    }

    setUser(newUser)
    writeUserCache(newUser)
    setIsLoading(false)
  }

  useEffect(() => {
    // Hydrate from sessionStorage immediately — no loading flash on return visits
    const cached = readUserCache()
    if (cached) {
      setUser(cached)
      setIsLoading(false)
    }

    // onAuthStateChange fires INITIAL_SESSION on mount, TOKEN_REFRESHED on token refresh, etc.
    // We use it as the single source of truth for all auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // If we have cached data already, refresh silently in the background.
        // If not, show loading state so the UI doesn't appear broken.
        const hasCachedUser = !!readUserCache()
        refreshSession(!hasCachedUser)
      } else {
        setUser(null)
        writeUserCache(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    writeUserCache(null)
    router.push("/student/login")
    router.refresh()
  }

  const value = useMemo(
    () => ({
      isAuthenticated: !!user,
      user,
      isLoading,
      isWorkbenchMode,
      setWorkbenchMode: setIsWorkbenchMode,
      logout,
      refreshSession
    }),
    [user, isLoading, isWorkbenchMode, router] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
