// lib/types.ts

export type UserRole = "student"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  classroomId?: string | null
  createdAt: string // ISO string from Supabase (timestamptz)
}

export interface Classroom {
  id: string
  code: string
  name: string
  teacherId: string
  isActive: boolean
  createdAt: string
  studentIds?: string[]
}

export interface StudentActivity {
  id: string
  studentId: string
  classroomId?: string | null
  activityType: string
  data: Record<string, any>
  timestamp: string
  xpAwarded?: number
  xpReason?: string
}

export interface StudentProgress {
  studentId: string
  studentName: string | null
  classroomId?: string | null
  simulationsCompleted: number
  casesCompleted: number
  totalTimeSpent: number
  stepsAttempted: Record<string, any>
  lastActivity: string
  // Gamification fields
  totalXP: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  ecgStepsCorrect: number
}

export interface CaseAssessment {
  id: string
  studentId: string | null
  studentName: string | null
  classroomId: string | null
  teacherId: string | null
  submittedAt: string
  patientCase: Record<string, any> | null
  ecgFindings: Record<string, any> | null
  assessment: Record<string, any> | null
}
