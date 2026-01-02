// lib/types.ts

export type UserRole = "teacher" | "student" | "platform_admin"

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
  aiFeedback?: Record<string, any> | null
}

export interface Organization {
  id: string
  name: string
  slug: string
  status: "trial" | "active" | "past_due" | "suspended"
  seatLimit?: number | null
  ownerUserId?: string | null
  domain?: string | null
  subdomain?: string | null
  logoUrl?: string | null
  contactEmail?: string | null
  signupPolicy?: "invite_only" | "domain_allow"
  allowedDomain?: string | null
  createdAt: string
}

export type OrgMemberRole = "org_admin" | "teacher" | "student"

export interface OrgMember {
  orgId: string
  userId: string
  role: OrgMemberRole
  createdAt: string
}

export interface Cohort {
  id: string
  orgId: string
  name: string
  term?: string | null
  createdAt: string
}

export interface CohortMember {
  cohortId: string
  userId: string
  createdAt: string
}

export interface Entitlements {
  orgId: string
  ecgPractice: boolean
  cases: boolean
  analytics: boolean
  aiFeedback: boolean
  cohortsEnabled: boolean
  attemptsPerDay?: number | null
  betaAccess: boolean
  seats?: number | null
  createdAt: string
}

export interface Invite {
  id: string
  orgId: string
  cohortId?: string | null
  teacherId?: string | null
  email: string
  fullName?: string | null
  role: "student" | "teacher"
  token: string
  expiresAt: string
  acceptedAt?: string | null
  createdAt: string
}

export interface Subscription {
  id: string
  orgId?: string | null
  userId?: string | null
  status: "trialing" | "active" | "past_due" | "canceled" | "lifetime"
  plan?: string | null
  seatLimit?: number | null
  isLifetime?: boolean
  compUntil?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  createdAt: string
}
