"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@/lib/types"
import {
  getUserById,
  saveUser,
} from "@/lib/storage"

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  /* ============================================================
     RESTORE SESSION ON PAGE LOAD
     ============================================================ */
  useEffect(() => {
    const restore = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session?.user) {
        let profile = await getUserById(data.session.user.id)

        if (!profile) {
          // If no profile exists (common after first social login), create one
          const authUser = data.session.user
          const newUser: User = {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Student",
            role: "student",
            classroomId: null,
            createdAt: new Date().toISOString(),
          }
          await saveUser(newUser)
          profile = newUser
        }

        if (profile) {
          const normalizedProfile = { ...profile, role: "student" as const }
          setUser(normalizedProfile)
          setIsAuthenticated(true)
        }
      }
    }

    restore()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        restore()
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/login",
      }
    })

    if (error) {
      console.error("Google login error:", error)
      throw error
    }
  }

  /* ============================================================
     LOGIN (Supabase v2-Compatible)
     ============================================================ */
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Supabase v2 places authenticated user in data.session.user
    if (error || !data.session?.user) {
      console.error("Supabase login error:", error)
      return { success: false, error: "Invalid credentials" }
    }

    const authUser = data.session.user

    const dbUser = await getUserById(authUser.id)
    let resolvedUser = dbUser

    if (!resolvedUser) {
      const fallbackName =
        (authUser.user_metadata?.name as string | undefined) ||
        authUser.email?.split("@")[0] ||
        email.split("@")[0] ||
        "Student"

      const newUser: User = {
        id: authUser.id,
        email: authUser.email ?? email,
        name: fallbackName,
        role: "student",
        classroomId: null,
        createdAt: new Date().toISOString(),
      }

      try {
        await saveUser(newUser)
        resolvedUser = newUser
      } catch (saveError) {
        console.error("Failed to create missing user profile:", saveError)
        return { success: false, error: "User profile missing" }
      }
    }

    const normalizedUser = { ...resolvedUser, role: "student" as const }
    setUser(normalizedUser)
    setIsAuthenticated(true)

    router.push("/ecg/practice")

    return { success: true }
  }

  /* ============================================================
     REGISTER (Supabase v2-Compatible)
     ============================================================ */
  const register = async (email: string, password: string, name: string) => {
    const role = "student" as const
    // Step 1 — Create the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          classroom_id: null,
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
      email,
      name,
      role,
      classroomId: null,
      createdAt: new Date().toISOString(),
    }

    await saveUser(newUser)

    // Step 3 — Auto-login (create session manually)
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginErr) {
      console.error("Auto-login failed:", loginErr)
      return { success: false, error: "Account created but login failed" }
    }

    setUser(newUser)
    setIsAuthenticated(true)

    router.push("/ecg/practice")

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
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
