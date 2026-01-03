"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import type { Classroom, StudentActivity, StudentProgress, User } from "@/lib/types"
import {
  getTeacherClassrooms,
  getClassroomProgressByIds,
  getStudentActivitiesByClassroomIds,
  getCaseAssessmentsByTeacher,
  getStudentsByClassroomIds,
} from "@/lib/storage"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, ChevronDown, ChevronUp, Download, Trash2, TrendingUp, Users } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"

type StudentWithProgress = User & { progress: StudentProgress }

type ParsedAiFeedback = {
  summary?: string
  strengths?: string[]
  corrections?: string[]
  improvements?: string[]
  resources?: { title: string; url?: string }[]
}

const EMPTY_PROGRESS: StudentProgress = {
  studentId: "",
  studentName: null,
  classroomId: null,
  simulationsCompleted: 0,
  casesCompleted: 0,
  totalTimeSpent: 0,
  stepsAttempted: {},
  lastActivity: "",
}

function parseAiFeedback(value: any): ParsedAiFeedback | null {
  if (!value) return null
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as ParsedAiFeedback
    } catch {
      return null
    }
  }
  return value as ParsedAiFeedback
}

function parseMaybeJson(value: any) {
  if (!value) return null
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [caseSubmissions, setCaseSubmissions] = useState<any[]>([])
  const [activities, setActivities] = useState<StudentActivity[]>([])
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const classroomNameMap = useMemo(
    () => new Map(classrooms.map((c) => [c.id, c.name])),
    [classrooms]
  )
  const assessmentCountMap = useMemo(() => {
    const map = new Map<string, number>()
    caseSubmissions.forEach((submission) => {
      map.set(submission.studentId, (map.get(submission.studentId) ?? 0) + 1)
    })
    return map
  }, [caseSubmissions])
  const simulationCountMap = useMemo(() => {
    const map = new Map<string, number>()
    activities.forEach((activity) => {
      if (
        activity.activityType === "simulation" &&
        activity.data?.step === "final-impression" &&
        activity.data?.correct
      ) {
        map.set(activity.studentId, (map.get(activity.studentId) ?? 0) + 1)
      }
    })
    return map
  }, [activities])
  const lastActivityMap = useMemo(() => {
    const map = new Map<string, string>()
    activities.forEach((activity) => {
      const timestamp = activity.timestamp
      const existing = map.get(activity.studentId)
      if (!existing || new Date(timestamp).getTime() > new Date(existing).getTime()) {
        map.set(activity.studentId, timestamp)
      }
    })
    caseSubmissions.forEach((submission) => {
      const timestamp = submission.submittedAt
      const existing = map.get(submission.studentId)
      if (!existing || new Date(timestamp).getTime() > new Date(existing).getTime()) {
        map.set(submission.studentId, timestamp)
      }
    })
    return map
  }, [activities, caseSubmissions])
  const avgCompletionRate = useMemo(() => {
    const simulationAttempts = activities.filter(
      (activity) => activity.activityType === "simulation" && typeof activity.data?.correct === "boolean"
    )
    if (!simulationAttempts.length) return 0
    const correct = simulationAttempts.filter((activity) => activity.data?.correct).length
    return correct / simulationAttempts.length
  }, [activities])

  const handleDownload = (submission: any) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Case Assessment", 14, 18)
    doc.setFontSize(12)
    doc.text(`Student: ${submission.studentName || "N/A"}`, 14, 26)
    doc.text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, 14, 32)
    const classroomName = classroomNameMap.get(submission.classroomId) || submission.classroomId || "—"
    doc.text(`Classroom: ${classroomName}`, 14, 38)
    doc.text("Powered by Medlab Interactive", 14, 44)

    const assessment = submission.assessment || {}
    const patientCase = parseMaybeJson(submission.patientCase) || {}
    const ecgFindings = parseMaybeJson(submission.ecgFindings) || {}

    const correctAxis = ecgFindings?.abnormalities?.leftAxis
      ? "Left axis deviation"
      : ecgFindings?.abnormalities?.rightAxis
      ? "Right axis deviation"
      : "Normal axis"

    const correctWaveforms = [
      ecgFindings?.abnormalities?.qWaves ? "Q waves" : null,
      ecgFindings?.abnormalities?.stElevation ? "ST elevation" : null,
      ecgFindings?.abnormalities?.stDepression ? "ST depression" : null,
      ecgFindings?.abnormalities?.tWaveInversion ? "T wave inversion" : null,
    ]
      .filter(Boolean)
      .join(", ") || "None"

    const correctRhythm =
      ecgFindings?.rhythm === "normal"
        ? "Normal sinus rhythm"
        : ecgFindings?.rhythm
        ? String(ecgFindings.rhythm)
        : "Not provided"

    const rows = [
      ["Rate (bpm)", assessment.rate || "—", ecgFindings?.heartRate ? String(ecgFindings.heartRate) : "Not provided"],
      ["Rhythm", assessment.rhythm || "—", correctRhythm],
      ["PR (ms)", assessment.prInterval || "—", "Not provided"],
      ["QRS (ms)", assessment.qrsInterval || "—", "Not provided"],
      ["QT (ms)", assessment.qtInterval || "—", "Not provided"],
      ["Axis", assessment.axis || "—", correctAxis],
      [
        "Chamber Enlargement",
        Object.entries(assessment.chamberEnlargement || {})
          .filter(([, v]) => v)
          .map(([k]) => k.toUpperCase())
          .join(", ") || "None",
        "Not provided",
      ],
      [
        "Waveform Abnormalities",
        Object.entries(assessment.waveformAbnormalities || {})
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ") || "None",
        correctWaveforms,
      ],
      ["Diagnosis", assessment.diagnosis || "—", patientCase?.correctDiagnosis || "Not provided"],
    ]

    // @ts-ignore
    doc.autoTable({
      startY: 46,
      head: [["Field", "Student Answer", "Correct Answer"]],
      body: rows,
      styles: { fontSize: 10 },
    })

    const aiFeedback = parseAiFeedback(submission.aiFeedback)
    if (aiFeedback) {
      const nextY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 120
      const aiRows = [
        ["Summary", aiFeedback.summary || "—"],
        ["Strengths", (aiFeedback.strengths || []).join("; ") || "—"],
        ["Corrections", (aiFeedback.corrections || []).join("; ") || "—"],
        ["Improvements", (aiFeedback.improvements || []).join("; ") || "—"],
      ]
      // @ts-ignore
      doc.autoTable({
        startY: nextY,
        head: [["AI Feedback", "Details"]],
        body: aiRows,
        styles: { fontSize: 9 },
      })
    }

    doc.save(`medlab-assessment-${submission.studentName || "student"}.pdf`)
  }

  useEffect(() => {
    if (user?.role === "teacher" && user.id) {
      const load = async () => {
        setLoading(true)
        const teacherClassrooms = await getTeacherClassrooms(user.id)
        setClassrooms(teacherClassrooms)
        const classroomIds = teacherClassrooms.map((c) => c.id)

        if (classroomIds.length) {
          const [studentRows, progressRows, submissions, activityRows] = await Promise.all([
            getStudentsByClassroomIds(classroomIds),
            getClassroomProgressByIds(classroomIds),
            getCaseAssessmentsByTeacher(user.id),
            getStudentActivitiesByClassroomIds(classroomIds),
          ])
          setStudents(studentRows)
          setStudentProgress(progressRows)
          setCaseSubmissions(submissions)
          setActivities(activityRows)
        } else {
          setStudents([])
          setStudentProgress([])
          setCaseSubmissions([])
          setActivities([])
        }
        setLoading(false)
      }
      load()
    }
  }, [user])

  if (!user || user.role !== "teacher") {
    return null
  }

  const totalStudents = students.length
  const activeStudents = studentProgress.filter(
    (p) => p.lastActivity && Date.now() - new Date(p.lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length

  const progressMap = new Map(studentProgress.map((p) => [p.studentId, p]))
  const studentList: StudentWithProgress[] = students.map((student) => ({
    ...student,
    progress: progressMap.get(student.id) || {
      ...EMPTY_PROGRESS,
      studentId: student.id,
      studentName: student.name ?? null,
      classroomId: student.classroomId ?? null,
    },
  }))

  const handleRemoveStudent = async (studentId: string, classroomId: string | null) => {
    if (!classroomId) return
    const confirmed = window.confirm("Remove this student from the class?")
    if (!confirmed) return
    setRemovingStudentId(studentId)
    try {
      const res = await fetch("/api/teacher/remove-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, classroomId }),
      })
      if (!res.ok) {
        console.error("remove student failed", await res.json())
        return
      }
      setStudents((prev) => prev.filter((s) => s.id !== studentId))
      setStudentProgress((prev) => prev.filter((p) => p.studentId !== studentId))
      if (expandedStudentId === studentId) {
        setExpandedStudentId(null)
      }
    } finally {
      setRemovingStudentId(null)
    }
  }

  return (
    <ProtectedRoute requiredRole="teacher">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-sm text-muted-foreground">Review student progress and case assessments.</p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Loading students...</CardContent>
            </Card>
          ) : classrooms.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No classroom is assigned yet. Contact your org admin to get a class setup.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStudents}</div>
                    <p className="text-xs text-muted-foreground">{activeStudents} active this week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Completion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(avgCompletionRate * 100).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Across all students</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activities.length}</div>
                    <p className="text-xs text-muted-foreground">Total activities tracked</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Students</CardTitle>
                  <CardDescription>Full roster and analytics across your classes</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentList.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-white">
                      <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
                        <div className="col-span-3">Student</div>
                        <div className="col-span-3">Email</div>
                        <div className="col-span-2">Class</div>
                        <div className="col-span-1">Sims</div>
                        <div className="col-span-1">Cases</div>
                        <div className="col-span-1">Last activity</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>
                      {studentList.map((student) => {
                        const isExpanded = expandedStudentId === student.id
                        const lastActivity = lastActivityMap.get(student.id)
                        return (
                          <Fragment key={student.id}>
                            <div className="grid grid-cols-12 items-center border-t border-border px-4 py-3 text-sm">
                              <div className="col-span-3 font-semibold text-slate-900 truncate">
                                {student.name || "Unnamed"}
                              </div>
                              <div className="col-span-3 text-slate-600 truncate">{student.email ?? "—"}</div>
                              <div className="col-span-2 text-slate-600 truncate">
                                {student.classroomId
                                  ? classroomNameMap.get(student.classroomId) ?? "Unassigned"
                                  : "Unassigned"}
                              </div>
                              <div className="col-span-1 text-slate-900">
                                {simulationCountMap.get(student.id) ?? student.progress.simulationsCompleted}
                              </div>
                              <div className="col-span-1 text-slate-900">
                                {assessmentCountMap.get(student.id) ?? student.progress.casesCompleted}
                              </div>
                              <div className="col-span-1 text-slate-600 text-xs">
                                {lastActivity
                                  ? new Date(lastActivity).toLocaleDateString()
                                  : student.progress.lastActivity
                                  ? new Date(student.progress.lastActivity).toLocaleDateString()
                                  : "—"}
                              </div>
                              <div className="col-span-1 flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() =>
                                    setExpandedStudentId((prev) => (prev === student.id ? null : student.id))
                                  }
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  {isExpanded ? "Hide" : "Analytics"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleRemoveStudent(student.id, student.classroomId ?? null)}
                                  disabled={removingStudentId === student.id}
                                  aria-label="Remove student"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="border-t border-border bg-slate-50/40 px-4 py-4">
                                <StudentDetail
                                  student={student.progress}
                                  activities={activities.filter((a) => a.studentId === student.id)}
                                  assessments={caseSubmissions.filter((s) => s.studentId === student.id)}
                                  onDownload={handleDownload}
                                />
                              </div>
                            )}
                          </Fragment>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No students enrolled yet.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

function StudentDetail({
  student,
  activities,
  assessments,
  onDownload,
}: {
  student: StudentProgress
  activities: StudentActivity[]
  assessments: any[]
  onDownload: (submission: any) => void
}) {
  const simulationCount = activities.filter(
    (activity) =>
      activity.activityType === "simulation" &&
      activity.data?.step === "final-impression" &&
      activity.data?.correct
  ).length
  const caseCount = assessments.length
  const lastActivityTimestamp = activities.reduce<string | null>((latest, activity) => {
    if (!latest) return activity.timestamp
    return new Date(activity.timestamp).getTime() > new Date(latest).getTime() ? activity.timestamp : latest
  }, null)
  const lastAssessmentTimestamp = assessments.reduce<string | null>((latest, assessment) => {
    if (!latest) return assessment.submittedAt
    return new Date(assessment.submittedAt).getTime() > new Date(latest).getTime() ? assessment.submittedAt : latest
  }, null)
  const latestTimestamp =
    lastActivityTimestamp && lastAssessmentTimestamp
      ? new Date(lastActivityTimestamp).getTime() > new Date(lastAssessmentTimestamp).getTime()
        ? lastActivityTimestamp
        : lastAssessmentTimestamp
      : lastActivityTimestamp || lastAssessmentTimestamp || student.lastActivity

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="text-lg font-semibold mb-2">Detail: {student.studentName || "Student"}</h3>
      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Simulations</div>
          <div className="text-xl font-semibold">{simulationCount}</div>
        </div>
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Cases</div>
          <div className="text-xl font-semibold">{caseCount}</div>
        </div>
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Last activity</div>
          <div className="text-xl font-semibold">
            {latestTimestamp ? new Date(latestTimestamp).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold mb-2">Recent Activities</h4>
          <div className="space-y-2 text-sm">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="rounded border border-border p-2">
                <div className="font-medium">{act.activityType}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(act.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Case Assessments</h4>
          <div className="space-y-2 text-sm">
            {assessments.slice(0, 5).map((ass) => {
              const aiFeedback = parseAiFeedback(ass.aiFeedback)
              const improvements = (aiFeedback?.improvements || []).slice(0, 3)
              const strengths = (aiFeedback?.strengths || []).slice(0, 3)
              const corrections = (aiFeedback?.corrections || []).slice(0, 3)
              return (
                <div key={ass.id} className="rounded border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Submitted {new Date(ass.submittedAt).toLocaleString()}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => onDownload(ass)}
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Diagnosis: {ass.assessment?.diagnosis ?? "—"}</div>
                  {aiFeedback?.summary && (
                    <div className="text-xs text-muted-foreground">AI summary: {aiFeedback.summary}</div>
                  )}
                  {strengths.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Strengths: {strengths.join(" · ")}
                    </div>
                  )}
                  {corrections.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Corrections: {corrections.join(" · ")}
                    </div>
                  )}
                  {improvements.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Needs revision: {improvements.join(" · ")}
                    </div>
                  )}
                </div>
              )
            })}
            {assessments.length === 0 && <p className="text-xs text-muted-foreground">No assessments yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
