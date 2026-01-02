"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { User as SupabaseAuthUser } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { User, UserRole } from "@/lib/types"
import {
  getUserById,
  saveUser,
  getClassroomByCode,
  getTeacherClassrooms,
  saveClassroom,
} from "@/lib/storage"

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, role: UserRole, classroomCode?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string | null | undefined): value is string {
  return typeof value === "string" && uuidRegex.test(value)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  const ensureTeacherClassroom = async (teacherId: string, teacherName: string) => {
    const existing = await getTeacherClassrooms(teacherId)
    if (existing.length === 0) {
      const firstName = teacherName.split(" ")[0] || "Teacher"
      await saveClassroom({
        name: `${firstName}'s Classroom`,
        teacherId,
      })
    }
  }

  const normalizeClassroomId = async (candidate?: string | null) => {
    if (!candidate) return null
    if (isValidUUID(candidate)) return candidate

    const classroom = await getClassroomByCode(candidate)
    return classroom?.id ?? null
  }

  const ensureProfile = async (authUser: SupabaseAuthUser, fallbackEmail: string) => {
    const existing = await getUserById(authUser.id)
    if (existing) {
      if (existing.role === "teacher") {
        try {
          await ensureTeacherClassroom(existing.id, existing.name)
        } catch (error) {
          console.error("ensureTeacherClassroom error:", error)
        }
      }
      return existing
    }

    const metadata = authUser.user_metadata ?? {}
    const metadataRole = (metadata.role as string | undefined)?.toLowerCase()
    const derivedRole: UserRole =
      metadataRole === "teacher"
        ? "teacher"
        : metadataRole === "platform_admin"
          ? "platform_admin"
          : "student"

    const resolvedClassroomId = await normalizeClassroomId(
      metadata.classroom_id as string | undefined
    )

    const fallbackName =
      (metadata.name as string | undefined) ||
      (metadata.full_name as string | undefined) ||
      authUser.email?.split("@")[0] ||
      fallbackEmail.split("@")[0] ||
      "User"

    const profile: User = {
      id: authUser.id,
      email: (authUser.email ?? fallbackEmail).toLowerCase(),
      name: fallbackName,
      role: derivedRole,
      classroomId: resolvedClassroomId,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveUser(profile)
      if (profile.role === "teacher") {
        try {
          await ensureTeacherClassroom(profile.id, profile.name)
        } catch (error) {
          console.error("ensureTeacherClassroom error:", error)
        }
      }
      return profile
    } catch (error) {
      console.error("Failed to create missing user profile:", error)
      return null
    }
  }

  /* ============================================================
     RESTORE SESSION ON PAGE LOAD
     ============================================================ */
  useEffect(() => {
    const restore = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session?.user) {
        const profile = await ensureProfile(
          data.session.user,
          data.session.user.email ?? ""
        )

        if (!profile) return

        setUser(profile)
        setIsAuthenticated(true)
      }
    }

    restore()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          ensureProfile(session.user, session.user.email ?? "").then(
            (profile) => {
              if (!profile) return
              setUser(profile)
              setIsAuthenticated(true)
            }
          )
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  /* ============================================================
     LOGIN (Supabase v2-Compatible)
     ============================================================ */
  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    // Supabase v2 places authenticated user in data.session.user
    if (error || !data.session?.user) {
      console.error("Supabase login error:", error)
      return { success: false, error: "Invalid credentials" }
    }

    const authUser = data.session.user

    const dbUser = await ensureProfile(authUser, normalizedEmail)
    if (!dbUser) {
      return { success: false, error: "User profile missing" }
    }

    setUser(dbUser)
    setIsAuthenticated(true)

    // Try to route students with org membership to their org workspace
    if (dbUser.role === "platform_admin") {
      router.push("/platform-admin")
      return { success: true }
    }

    if (dbUser.role === "teacher") {
      router.push("/teacher/dashboard")
      return { success: true }
    }

    const { data: memberships } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(slug)")
      .eq("user_id", authUser.id)
      .limit(1)

    const orgRelation = (memberships?.[0] as any)?.organizations
    const slug = Array.isArray(orgRelation) ? orgRelation[0]?.slug : orgRelation?.slug

    if (slug) {
      router.push(`/org/${slug}/student`)
    } else {
      router.push("/ecg")
    }

    return { success: true }
  }

  /* ============================================================
     REGISTER (Supabase v2-Compatible)
     ============================================================ */
  const register = async (email: string, password: string, name: string, role: UserRole, classroomCode?: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim()

    let classroomId: string | null = null
    if (role === "student") {
      if (!classroomCode?.trim()) {
        return { success: false, error: "Classroom code is required for students" }
      }

      const classroom = await getClassroomByCode(classroomCode.trim().toUpperCase())

      if (!classroom) {
        return { success: false, error: "Invalid classroom code" }
      }

      if (!classroom.isActive) {
        return { success: false, error: "Classroom is no longer active" }
      }

      classroomId = classroom.id
    }

    // Step 1 — Create the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName,
          role,
          classroom_id: classroomId,
        },
      },
    })

    if (error) {
      console.error("Supabase signUp error:", error)
      return { success: false, error: error.message }
    }

    const authUser = data.user ?? data.session?.user

    if (!authUser) {
      console.error("Signup succeeded but no user returned")
      return { success: false, error: "Failed to create user account" }
    }

    // Step 2 — Save user profile row (public.users)
    const newUser: User = {
      id: authUser.id,
      email: normalizedEmail,
      name: normalizedName,
      role,
      classroomId,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveUser(newUser)
    } catch (saveError) {
      console.error("saveUser error:", saveError)
      return { success: false, error: "Failed to create user profile" }
    }

    // Step 3 — Auto-create a classroom for new teachers
    if (role === "teacher") {
      try {
        const existing = await getTeacherClassrooms(authUser.id)
        if (existing.length === 0) {
          const firstName = normalizedName.split(" ")[0] || "Teacher"
          await saveClassroom({
            name: `${firstName}'s Classroom`,
            teacherId: authUser.id,
          })
        }
      } catch (classroomError) {
        console.error("Auto classroom create failed:", classroomError)
      }
    }

    // Step 4 — Auto-login (create session manually)
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (loginErr) {
      console.error("Auto-login failed:", loginErr)
      return { success: false, error: "Account created but login failed" }
    }

    setUser(newUser)
    setIsAuthenticated(true)

    if (role === "teacher") {
      router.push("/teacher/dashboard")
    } else {
      router.push("/ecg")
    }

    return { success: true }
  }


  /* ============================================================
     LOGOUT
     ============================================================ */
  const logout = () => {
    supabase.auth.signOut().finally(() => {
      setUser(null)
      setIsAuthenticated(false)
      router.push("/")
    })
  }

  /* ============================================================
     PROVIDER VALUE
     ============================================================ */
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
