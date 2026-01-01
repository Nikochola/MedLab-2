"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, UserRole } from "@/lib/types"
import {
  getUserById,
  getUserByEmail,
  saveUser,
  getClassroomByCode,
} from "@/lib/storage"

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, role: UserRole, classroomCode?: string) => Promise<{ success: boolean; error?: string }>
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
        const profile = await getUserById(data.session.user.id)
        if (profile) {
          setUser(profile)
          setIsAuthenticated(true)
        }
      }
    }

    restore()
  }, [])

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
    if (!dbUser) {
      console.error("Profile missing in public.users for:", authUser.id)
      return { success: false, error: "User profile missing" }
    }

    setUser(dbUser)
    setIsAuthenticated(true)

    if (dbUser.role === "teacher") {
      router.push("/teacher/dashboard")
    } else {
      router.push("/ecg")
    }

    return { success: true }
  }

  /* ============================================================
     REGISTER (Supabase v2-Compatible)
     ============================================================ */
  const register = async (email: string, password: string, name: string, role: UserRole, classroomCode?: string) => {
 // Step 1 — Create the user in Supabase Auth
 const { data, error } = await supabase.auth.signUp({
   email,
   password,
   options: {
     data: {
       name,
       role,
       classroom_id: classroomCode || null,
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
   classroomId: classroomCode || null,
   createdAt: new Date().toISOString(),
 }

  await saveUser(newUser)

  // Step 3 — Auto-login (create session manually)
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email,
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
