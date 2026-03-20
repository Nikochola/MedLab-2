export type InstitutionRole = "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT"

export interface InstitutionRecord {
  id: string
  name: string
  slug: string
  logo_url: string | null
  timezone: string | null
  institution_type?: string | null
  country_region?: string | null
  estimated_students?: number | null
  billing_plan?: string | null
  billing_status?: string | null
  billing_interval?: string | null
  billing_code?: string | null
  billing_contact_name?: string | null
  billing_card_brand?: string | null
  billing_card_last4?: string | null
  content_library?: string | null
  student_access_policy?: string | null
  onboarding_completed_at?: string | null
  access_request_id?: string | null
  created_at: string
}

export interface CourseRecord {
  id: string
  institution_id: string
  name: string
  code: string | null
  term: string | null
  start_date: string | null
  end_date: string | null
  is_archived: boolean
  created_at: string
}

export interface InstitutionContext {
  institution: InstitutionRecord
  membership: {
    institution_id: string
    user_id: string
    role: InstitutionRole
    status: "ACTIVE" | "INVITED" | "SUSPENDED"
    created_at: string
  }
}

export interface MemberRow {
  membership_id: string
  user_id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: "EDUCATOR" | "STUDENT"
  status: "ACTIVE" | "INVITED" | "DROPPED"
  created_at: string
}

export interface InviteInputRow {
  email: string
  name?: string | null
  metadata?: Record<string, unknown> | null
}

export interface InviteRowResult {
  email: string
  status: "INVITED" | "SKIPPED" | "ERROR"
  reason?: string
}

export interface InviteSummary {
  role: InstitutionRole
  total_rows: number
  invited_count: number
  skipped_count: number
  error_count: number
  results: InviteRowResult[]
}

export interface CourseAnalytics {
  activeStudents: number
  totalAttempts: number
  averageScore: number | null
  trend: Array<{
    date: string
    attempts: number
    averageScore: number | null
  }>
  weakestCases: Array<{
    caseId: string
    attempts: number
    averageScore: number | null
  }>
  hasAttempts: boolean
}
