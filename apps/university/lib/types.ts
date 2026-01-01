// lib/types.ts

export type UserRole = "teacher" | "student"

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
