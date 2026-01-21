import Link from "next/link"
import { redirect } from "next/navigation"
import { getOrgContext, getEntitlementsForOrg, getCohortsForOrg } from "@/lib/orgs"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { logoutAction } from "@/app/actions/auth"
import { INTERPRETATION_STEPS } from "@/lib/constants"
import { OrgAdminHeader } from "@/components/org-admin/OrgAdminHeader"

interface OrgAdminPageProps {
  params: { slug: string }
}

function Info({ hint }: { hint: string }) {
  return (
    <span className="relative inline-flex align-middle group">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">i</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
        {hint}
      </span>
    </span>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000
const FINAL_SIMULATION_STEP = INTERPRETATION_STEPS[INTERPRETATION_STEPS.length - 1]

type ActivityRow = {
  student_id: string
  activity_type: string
  data: Record<string, any> | null
  timestamp: string
}

type AssessmentRow = {
  student_id: string | null
  submitted_at: string
  ai_feedback: Record<string, any> | null
}

type ProgressRow = {
  student_id: string
  student_name: string | null
  classroom_id: string | null
  simulations_completed: number | null
  cases_completed: number | null
  total_time_spent: number | null
  last_activity: string | null
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatLearningTime(seconds: number) {
  const minutes = Math.round((seconds || 0) / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} hr`
}

function formatPercent(value: number | null, digits = 0) {
  if (value === null || Number.isNaN(value)) return "n/a"
  return `${(value * 100).toFixed(digits)}%`
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "No activity"
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS)
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "1d ago"
  return `${diffDays}d ago`
}

function daysSince(value?: string | null) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS)
}

function getEngagementStatus(daysInactive: number | null) {
  if (daysInactive === null) {
    return { label: "No activity", tone: "bg-slate-100 text-slate-600" }
  }
  if (daysInactive <= 7) {
    return { label: "Active", tone: "bg-emerald-100 text-emerald-700" }
  }
  if (daysInactive <= 30) {
    return { label: "Warming", tone: "bg-amber-100 text-amber-700" }
  }
  return { label: "Dormant", tone: "bg-rose-100 text-rose-700" }
}

function updateLatest(map: Map<string, string>, studentId: string, timestamp?: string | null) {
  if (!timestamp) return
  const existing = map.get(studentId)
  if (!existing || new Date(timestamp).getTime() > new Date(existing).getTime()) {
    map.set(studentId, timestamp)
  }
}

function buildDailyBuckets(days: number) {
  const today = startOfDay(new Date())
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - 1 - index) * DAY_MS)
    return {
      date,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      simulations: 0,
      cases: 0,
      hints: 0,
    }
  })
  return { buckets, today }
}

function getBucketIndex(date: Date, today: Date, days: number) {
  const day = startOfDay(date)
  const diffDays = Math.floor((today.getTime() - day.getTime()) / DAY_MS)
  if (diffDays < 0 || diffDays >= days) return null
  return days - 1 - diffDays
}

export default async function OrgAdminPage({ params }: OrgAdminPageProps) {
  const ctx = await getOrgContext()
  if (!ctx.userId) redirect("/login")
  const org = ctx.organizations.find((o) => o.slug === params.slug)
  if (!org) redirect("/org-admin")
  const membership = ctx.memberships.find((m) => m.orgId === org.id)
  if (!membership || membership.role !== "org_admin") redirect("/")

  const supabase = createSupabaseServerClient()
  const { data: memberRows, error: memberError } = await supabase.from("org_members").select("user_id, role").eq("org_id", org.id)
  if (memberError) {
    console.error("org admin members error:", memberError)
  }

  const members = memberRows ?? []
  const studentIds = members.filter((m) => m.role === "student").map((m) => m.user_id as string)
  const teacherIds = members.filter((m) => m.role === "teacher").map((m) => m.user_id as string)
  const orgAdminIds = members.filter((m) => m.role === "org_admin").map((m) => m.user_id as string)
  const userIds = members.map((m) => m.user_id as string)

  const [userRows, progressRows, entitlements, cohorts] = await Promise.all([
    userIds.length
      ? supabase.from("users").select("id, email, name, classroom_id, created_at").in("id", userIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase
          .from("student_progress")
          .select("student_id, student_name, classroom_id, simulations_completed, cases_completed, total_time_spent, last_activity")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] }),
    getEntitlementsForOrg(org.id),
    getCohortsForOrg(org.id),
  ])

  if ("error" in userRows && userRows.error) {
    console.error("org admin users error:", userRows.error)
  }
  if ("error" in progressRows && progressRows.error) {
    console.error("org admin progress error:", progressRows.error)
  }

  const users = userRows.data ?? []
  const progress = (progressRows.data ?? []) as ProgressRow[]

  const userMap = new Map(users.map((u) => [u.id as string, u]))

  const classroomIdSet = new Set<string>()
  users.forEach((u) => {
    if (u.classroom_id) classroomIdSet.add(u.classroom_id as string)
  })

  const { data: classroomRows, error: classroomError } = classroomIdSet.size
    ? await supabase
        .from("classrooms")
        .select("id, name, teacher_id, is_active, created_at")
        .in("id", Array.from(classroomIdSet))
    : { data: [] }

  if (classroomError) {
    console.error("org admin classrooms error:", classroomError)
  }

  const classroomMap = new Map((classroomRows ?? []).map((row) => [row.id as string, row]))

  const activityCutoff = new Date()
  activityCutoff.setDate(activityCutoff.getDate() - 90)

  const [activityRows, assessmentRows] = await Promise.all([
    studentIds.length
      ? supabase
          .from("student_activities")
          .select("student_id, activity_type, data, timestamp")
          .in("student_id", studentIds)
          .gte("timestamp", activityCutoff.toISOString())
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase
          .from("case_assessments")
          .select("student_id, submitted_at, ai_feedback")
          .in("student_id", studentIds)
          .gte("submitted_at", activityCutoff.toISOString())
      : Promise.resolve({ data: [] }),
  ])

  if ("error" in activityRows && activityRows.error) {
    console.error("org admin activities error:", activityRows.error)
  }
  if ("error" in assessmentRows && assessmentRows.error) {
    console.error("org admin assessments error:", assessmentRows.error)
  }

  const activities = (activityRows.data ?? []) as ActivityRow[]
  const assessments = (assessmentRows.data ?? []) as AssessmentRow[]

  const progressMap = new Map(progress.map((row) => [row.student_id, row]))
  const lastActivityMap = new Map<string, string>()
  progress.forEach((row) => updateLatest(lastActivityMap, row.student_id, row.last_activity))

  const activityStats = new Map<
    string,
    {
      simulationAttempts: number
      simulationCorrect: number
      simulationCompletions: number
      hints: number
    }
  >()
  const assessmentStats = new Map<string, { cases: number; aiFeedback: number }>()

  const totals = {
    simulations: 0,
    cases: 0,
    hints: 0,
    gradedAttempts: 0,
    gradedCorrect: 0,
  }

  const periodCounts = {
    last7: { simulations: 0, cases: 0, hints: 0 },
    prev7: { simulations: 0, cases: 0, hints: 0 },
  }

  const { buckets, today } = buildDailyBuckets(7)

  for (const activity of activities) {
    const studentId = activity.student_id
    const stats = activityStats.get(studentId) ?? {
      simulationAttempts: 0,
      simulationCorrect: 0,
      simulationCompletions: 0,
      hints: 0,
    }

    if (activity.activity_type === "hint") {
      stats.hints += 1
      totals.hints += 1
    }

    if (activity.activity_type === "simulation") {
      totals.simulations += 1
      if (typeof activity.data?.correct === "boolean") {
        stats.simulationAttempts += 1
        totals.gradedAttempts += 1
        if (activity.data.correct) {
          stats.simulationCorrect += 1
          totals.gradedCorrect += 1
        }
      }
      if (activity.data?.step === FINAL_SIMULATION_STEP && activity.data?.correct) {
        stats.simulationCompletions += 1
      }
    }

    activityStats.set(studentId, stats)
    updateLatest(lastActivityMap, studentId, activity.timestamp)

    const activityDate = new Date(activity.timestamp)
    const daysAgo = Math.floor((today.getTime() - startOfDay(activityDate).getTime()) / DAY_MS)
    if (daysAgo >= 0 && daysAgo <= 6) {
      if (activity.activity_type === "simulation") periodCounts.last7.simulations += 1
      if (activity.activity_type === "hint") periodCounts.last7.hints += 1
    } else if (daysAgo >= 7 && daysAgo <= 13) {
      if (activity.activity_type === "simulation") periodCounts.prev7.simulations += 1
      if (activity.activity_type === "hint") periodCounts.prev7.hints += 1
    }

    const bucketIndex = getBucketIndex(activityDate, today, buckets.length)
    if (bucketIndex !== null) {
      if (activity.activity_type === "simulation") buckets[bucketIndex].simulations += 1
      if (activity.activity_type === "hint") buckets[bucketIndex].hints += 1
    }
  }

  for (const assessment of assessments) {
    if (!assessment.student_id) continue
    const studentId = assessment.student_id
    const stats = assessmentStats.get(studentId) ?? { cases: 0, aiFeedback: 0 }
    stats.cases += 1
    if (assessment.ai_feedback) stats.aiFeedback += 1
    assessmentStats.set(studentId, stats)

    totals.cases += 1
    updateLatest(lastActivityMap, studentId, assessment.submitted_at)

    const assessmentDate = new Date(assessment.submitted_at)
    const daysAgo = Math.floor((today.getTime() - startOfDay(assessmentDate).getTime()) / DAY_MS)
    if (daysAgo >= 0 && daysAgo <= 6) {
      periodCounts.last7.cases += 1
    } else if (daysAgo >= 7 && daysAgo <= 13) {
      periodCounts.prev7.cases += 1
    }

    const bucketIndex = getBucketIndex(assessmentDate, today, buckets.length)
    if (bucketIndex !== null) {
      buckets[bucketIndex].cases += 1
    }
  }

  const studentRows = studentIds.map((studentId) => {
    const user = userMap.get(studentId)
    const progressRow = progressMap.get(studentId)
    const activity = activityStats.get(studentId)
    const assessment = assessmentStats.get(studentId)
    const classroomId = (user?.classroom_id as string | null) ?? progressRow?.classroom_id ?? null
    const classroom = classroomId ? classroomMap.get(classroomId) : null
    const teacherId = classroom?.teacher_id as string | undefined
    const teacherUser = teacherId ? userMap.get(teacherId) : null
    const lastActivity = lastActivityMap.get(studentId) ?? progressRow?.last_activity ?? null
    const accuracy = activity?.simulationAttempts
      ? activity.simulationCorrect / activity.simulationAttempts
      : null
    const totalSimulations = (progressRow?.simulations_completed ?? 0) as number
    const totalCases = (progressRow?.cases_completed ?? 0) as number
    const totalTime = (progressRow?.total_time_spent ?? 0) as number
    const status = getEngagementStatus(daysSince(lastActivity))

    return {
      id: studentId,
      name: user?.name ?? progressRow?.student_name ?? "Student",
      email: user?.email ?? "",
      createdAt: user?.created_at ?? null,
      classroomId,
      classroomName: classroom?.name ?? "Unassigned",
      teacherName: teacherUser?.name ?? teacherUser?.email ?? "",
      simulations: totalSimulations,
      cases: totalCases,
      totalTime,
      lastActivity,
      status,
      accuracy,
      hints: activity?.hints ?? 0,
      recentCases: assessment?.cases ?? 0,
      aiFeedback: assessment?.aiFeedback ?? 0,
      completions: activity?.simulationCompletions ?? 0,
    }
  })

  const totalStudents = studentIds.length
  const totalTeachers = teacherIds.length
  const totalOrgAdmins = orgAdminIds.length
  const seatsUsed = totalStudents + totalTeachers
  const seatLimit = org.seatLimit ?? null
  const seatsRemaining = seatLimit ? Math.max(seatLimit - seatsUsed, 0) : null

  const totalSimulations = studentRows.reduce((sum, row) => sum + row.simulations, 0)
  const totalCases = studentRows.reduce((sum, row) => sum + row.cases, 0)
  const totalTime = studentRows.reduce((sum, row) => sum + row.totalTime, 0)
  const avgSimulations = totalStudents ? totalSimulations / totalStudents : 0
  const avgCases = totalStudents ? totalCases / totalStudents : 0

  const active7 = studentRows.filter((row) => (daysSince(row.lastActivity) ?? 999) <= 7).length
  const active30 = studentRows.filter((row) => (daysSince(row.lastActivity) ?? 999) <= 30).length
  const noActivity = studentRows.filter((row) => !row.lastActivity).length
  const warming = studentRows.filter((row) => {
    const days = daysSince(row.lastActivity)
    return days !== null && days > 7 && days <= 30
  }).length
  const dormant = studentRows.filter((row) => {
    const days = daysSince(row.lastActivity)
    return days !== null && days > 30
  }).length

  const unassignedStudents = studentRows.filter((row) => !row.classroomId).length
  const newStudents = studentRows.filter((row) => {
    if (!row.createdAt) return false
    return daysSince(row.createdAt) !== null && (daysSince(row.createdAt) as number) <= 30
  }).length

  const averageAccuracy = totals.gradedAttempts ? totals.gradedCorrect / totals.gradedAttempts : null
  const simulationAdoption = totalStudents
    ? studentRows.filter((row) => row.simulations > 0).length / totalStudents
    : 0
  const caseAdoption = totalStudents ? studentRows.filter((row) => row.cases > 0).length / totalStudents : 0
  const last7Total = periodCounts.last7.simulations + periodCounts.last7.cases + periodCounts.last7.hints
  const prev7Total = periodCounts.prev7.simulations + periodCounts.prev7.cases + periodCounts.prev7.hints
  const activityDelta = prev7Total ? (last7Total - prev7Total) / prev7Total : null

  const maxBucketTotal = Math.max(
    1,
    ...buckets.map((bucket) => bucket.simulations + bucket.cases + bucket.hints)
  )

  const classroomStatsMap = new Map<
    string,
    {
      id: string
      name: string
      teacherName: string
      students: number
      simulations: number
      cases: number
      accuracyTotal: number
      accuracyCount: number
      lastActivity: string | null
    }
  >()

  studentRows.forEach((row) => {
    if (!row.classroomId) return
    const entry = classroomStatsMap.get(row.classroomId) ?? {
      id: row.classroomId,
      name: row.classroomName,
      teacherName: row.teacherName,
      students: 0,
      simulations: 0,
      cases: 0,
      accuracyTotal: 0,
      accuracyCount: 0,
      lastActivity: null,
    }
    entry.students += 1
    entry.simulations += row.simulations
    entry.cases += row.cases
    if (row.accuracy !== null) {
      entry.accuracyTotal += row.accuracy
      entry.accuracyCount += 1
    }
    if (row.lastActivity) {
      if (!entry.lastActivity || new Date(row.lastActivity).getTime() > new Date(entry.lastActivity).getTime()) {
        entry.lastActivity = row.lastActivity
      }
    }
    classroomStatsMap.set(row.classroomId, entry)
  })

  const classroomStats = Array.from(classroomStatsMap.values()).sort((a, b) => b.students - a.students)

  const topStudents = [...studentRows]
    .sort((a, b) => b.simulations + b.cases - (a.simulations + a.cases))
    .slice(0, 5)

  const atRiskStudents = studentRows
    .filter((row) => row.status.label === "Dormant" || row.status.label === "No activity")
    .slice(0, 6)

  const insights = [] as string[]
  if (seatLimit && seatsUsed / seatLimit >= 0.85) {
    insights.push(`Seat usage at ${Math.round((seatsUsed / seatLimit) * 100)}% (${seatsRemaining ?? 0} left).`)
  }
  if (unassignedStudents > 0) {
    insights.push(`${unassignedStudents} students are unassigned to a classroom.`)
  }
  if (dormant > 0) {
    insights.push(`${dormant} students inactive for 30+ days.`)
  }
  if (averageAccuracy !== null && averageAccuracy < 0.6) {
    insights.push("Simulation accuracy below 60%. Consider targeted review sessions.")
  }
  if (entitlements?.cases && caseAdoption < 0.4) {
    insights.push("Case adoption is under 40%. Consider assigning weekly case check-ins.")
  }
  if (!insights.length) {
    insights.push("Engagement looks healthy. Keep momentum with cohort challenges.")
  }

  studentRows.sort((a, b) => {
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
    return bTime - aTime
  })

  return (
    <div className="admin-canvas">
      <div className="max-w-7xl mx-auto space-y-8">
        <OrgAdminHeader
          orgSlug={org.slug}
          title={`${org.name} admin`}
          description="Monitor student outcomes, engagement, and operational health."
          active="overview"
          actions={
            <>
              <Link
                href="/account"
                className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 shadow-sm hover:bg-slate-50"
              >
                Account
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 shadow-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </form>
            </>
          }
        />

        <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
              <h2 className="text-xl font-semibold">Org overview</h2>
              <p className="text-sm text-muted-foreground">Seat usage, engagement, and learning momentum.</p>
            </div>
            <div className="text-xs text-muted-foreground">Updated from the latest activity signals.</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Seat usage</span>
                <Info hint="Teachers + students currently in this org vs seat limit." />
              </div>
              <div className="text-3xl font-bold">
                {seatsUsed}
                <span className="text-base font-medium text-muted-foreground">
                  {seatLimit ? ` / ${seatLimit}` : " seats"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Teachers: {totalTeachers} · Students: {totalStudents} · Admins: {totalOrgAdmins}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Active students (7d)</span>
                <Info hint="Students with activity in the last 7 days." />
              </div>
              <div className="text-3xl font-bold">
                {active7}
                <span className="text-base font-medium text-muted-foreground">
                  {totalStudents ? ` / ${totalStudents}` : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">30d active: {active30} · New students: {newStudents}</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Simulation accuracy (90d)</span>
                <Info hint="Correct ECG interpretation attempts over the last 90 days." />
              </div>
              <div className="text-3xl font-bold">{formatPercent(averageAccuracy)}</div>
              <p className="text-xs text-muted-foreground">Graded attempts: {totals.gradedAttempts}</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Learning time</span>
                <Info hint="Total learning time tracked across all students." />
              </div>
              <div className="text-3xl font-bold">{formatLearningTime(totalTime)}</div>
              <p className="text-xs text-muted-foreground">
                Avg per student: {formatLearningTime(totalStudents ? totalTime / totalStudents : 0)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Case submissions (90d)</span>
                <Info hint="Case assessments submitted in the last 90 days." />
              </div>
              <div className="text-3xl font-bold">{totals.cases}</div>
              <p className="text-xs text-muted-foreground">
                AI feedback usage: {formatPercent(totals.cases ? (studentRows.reduce((sum, row) => sum + row.aiFeedback, 0) / totals.cases) : null)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Cohorts</span>
                <Info hint="Number of cohorts created for this organization." />
              </div>
              <div className="text-3xl font-bold">{cohorts.length}</div>
              <p className="text-xs text-muted-foreground">Cohorts enabled: {entitlements?.cohortsEnabled ? "Yes" : "No"}</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Avg simulations</span>
                <Info hint="Average simulations completed per student." />
              </div>
              <div className="text-3xl font-bold">{Math.round(avgSimulations)}</div>
              <p className="text-xs text-muted-foreground">Adoption: {formatPercent(simulationAdoption)}</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Avg cases</span>
                <Info hint="Average case assessments completed per student." />
              </div>
              <div className="text-3xl font-bold">{Math.round(avgCases)}</div>
              <p className="text-xs text-muted-foreground">Adoption: {formatPercent(caseAdoption)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Engagement</p>
              <h2 className="text-xl font-semibold">Weekly engagement pulse</h2>
              <p className="text-sm text-muted-foreground">Momentum and learning activity from the last 7 days.</p>
            </div>
            <div className="text-xs text-muted-foreground">Simulations, cases, hints</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Activity pulse (7d)</h3>
                  <p className="text-sm text-muted-foreground">
                    {last7Total} total actions · {activityDelta === null ? "n/a" : `${Math.round(activityDelta * 100)}%`} vs previous week
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">Last 7 days</div>
              </div>
              <div className="flex items-end justify-between gap-2 h-28">
                {buckets.map((bucket) => {
                  const simHeight = Math.round((bucket.simulations / maxBucketTotal) * 100)
                  const caseHeight = Math.round((bucket.cases / maxBucketTotal) * 100)
                  const hintHeight = Math.round((bucket.hints / maxBucketTotal) * 100)
                  return (
                    <div key={bucket.label} className="flex flex-col items-center gap-2 flex-1">
                      <div className="flex h-20 w-full items-end justify-center gap-1">
                        <div className="flex w-full flex-col items-stretch justify-end rounded-md bg-slate-100">
                          <div
                            className="bg-blue-500 rounded-t-md"
                            style={{ height: `${simHeight}%` }}
                            title={`Simulations: ${bucket.simulations}`}
                          />
                          <div
                            className="bg-emerald-400"
                            style={{ height: `${caseHeight}%` }}
                            title={`Cases: ${bucket.cases}`}
                          />
                          <div
                            className="bg-amber-400 rounded-b-md"
                            style={{ height: `${hintHeight}%` }}
                            title={`Hints: ${bucket.hints}`}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">{bucket.label}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Simulations
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Cases
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Hints
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Engagement segments</h3>
                <p className="text-sm text-muted-foreground">Based on last activity timestamps.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active (0-7d)</span>
                  <span className="font-semibold">{active7}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Warming (8-30d)</span>
                  <span className="font-semibold">{warming}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dormant (31d+)</span>
                  <span className="font-semibold">{dormant}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">No activity</span>
                  <span className="font-semibold">{noActivity}</span>
                </div>
                <div className="border-t border-border pt-3 text-sm text-muted-foreground">
                  Avg hints per student: {totalStudents ? (totals.hints / totalStudents).toFixed(1) : "0.0"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Learners</p>
              <h2 className="text-xl font-semibold">Student analytics</h2>
              <p className="text-sm text-muted-foreground">Performance, momentum, and support signals per student.</p>
            </div>
            <Link href={`/org/${org.slug}/admin/members`} className="text-sm text-blue-600 hover:underline">
              Manage roster
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-3 lg:col-span-2">
              <div className="overflow-x-auto">
                <div className="min-w-[900px] divide-y divide-border/70 text-sm">
                  <div className="grid grid-cols-12 bg-slate-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <div className="col-span-3">Student</div>
                    <div className="col-span-3">Classroom</div>
                    <div className="col-span-2">Progress</div>
                    <div className="col-span-2">Accuracy / Hints</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  {studentRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-12 items-center px-3 py-3 transition-colors hover:bg-slate-50/80">
                      <div className="col-span-3">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.email || row.id}</div>
                      </div>
                      <div className="col-span-3">
                        <div className="font-medium">{row.classroomName}</div>
                        <div className="text-xs text-muted-foreground">{row.teacherName || ""}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium">{row.simulations} sims · {row.cases} cases</div>
                        <div className="text-xs text-muted-foreground">Time: {formatLearningTime(row.totalTime)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium">{formatPercent(row.accuracy)}</div>
                        <div className="text-xs text-muted-foreground">Hints: {row.hints} · 90d cases: {row.recentCases}</div>
                      </div>
                      <div className="col-span-2 flex flex-col items-start gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.status.tone}`}>{row.status.label}</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeDate(row.lastActivity)}</span>
                      </div>
                    </div>
                  ))}
                  {!studentRows.length && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">No students yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Actionable insights</h3>
                <p className="text-sm text-muted-foreground">Quick signals for admin follow-up.</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {insights.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-semibold">At-risk students</h3>
                <p className="text-xs text-muted-foreground">Students with no recent activity.</p>
                <div className="mt-2 space-y-2 text-sm">
                  {atRiskStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.classroomName}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatRelativeDate(student.lastActivity)}</div>
                    </div>
                  ))}
                  {!atRiskStudents.length && (
                    <div className="text-xs text-muted-foreground">No at-risk students right now.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Classrooms</p>
              <h2 className="text-xl font-semibold">Classroom insights</h2>
              <p className="text-sm text-muted-foreground">Class-level engagement and performance trends.</p>
            </div>
            <span className="text-xs text-muted-foreground">{classroomStats.length} classrooms</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Classroom performance</h3>
                <p className="text-sm text-muted-foreground">Outcomes by classroom and teacher.</p>
              </div>
              <div className="divide-y divide-border/70 text-sm">
                {classroomStats.map((classroom) => {
                  const avgAccuracy = classroom.accuracyCount
                    ? classroom.accuracyTotal / classroom.accuracyCount
                    : null
                  return (
                    <div key={classroom.id} className="flex items-center justify-between py-2 transition-colors hover:bg-slate-50/80">
                      <div>
                        <div className="font-medium">{classroom.name}</div>
                        <div className="text-xs text-muted-foreground">{classroom.teacherName || ""}</div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{classroom.students} students</div>
                        <div>Avg sims: {Math.round(classroom.simulations / classroom.students)}</div>
                        <div>Accuracy: {formatPercent(avgAccuracy)}</div>
                      </div>
                    </div>
                  )
                })}
                {!classroomStats.length && (
                  <div className="py-6 text-center text-sm text-muted-foreground">No classroom data yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Top performers</h3>
                <p className="text-sm text-muted-foreground">Students with the most completed work.</p>
              </div>
              <div className="space-y-3">
                {topStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.classroomName}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{student.simulations} sims · {student.cases} cases</div>
                      <div>Accuracy: {formatPercent(student.accuracy)}</div>
                    </div>
                  </div>
                ))}
                {!topStudents.length && (
                  <div className="text-sm text-muted-foreground">No performance data yet.</div>
                )}
              </div>
              <div className="border-t border-border pt-3 text-sm text-muted-foreground">
                Students per teacher: {totalTeachers ? (totalStudents / totalTeachers).toFixed(1) : "n/a"} · Unassigned: {unassignedStudents}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Analytics notes</h2>
          <p className="text-sm text-muted-foreground">
            Activity metrics are based on the last 90 days of recorded simulations, hints, and case assessments.
          </p>
          <a href={`/org/${org.slug}/admin/audit`} className="inline-flex items-center text-sm text-blue-600 hover:underline">
            View audit log →
          </a>
        </section>
      </div>
    </div>
  )
}
