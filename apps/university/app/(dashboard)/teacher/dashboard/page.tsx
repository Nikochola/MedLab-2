"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Activity, ArrowUpRight, Download, TrendingUp, Users } from "lucide-react"
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

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [caseSubmissions, setCaseSubmissions] = useState<any[]>([])
  const [activities, setActivities] = useState<StudentActivity[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const classroomNameMap = useMemo(
    () => new Map(classrooms.map((c) => [c.id, c.name])),
    [classrooms]
  )

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
    const rows = [
      ["Rate (bpm)", assessment.rate || "—"],
      ["Rhythm", assessment.rhythm || "—"],
      ["PR (ms)", assessment.prInterval || "—"],
      ["QRS (ms)", assessment.qrsInterval || "—"],
      ["QT (ms)", assessment.qtInterval || "—"],
      ["Axis", assessment.axis || "—"],
      [
        "Chamber Enlargement",
        Object.entries(assessment.chamberEnlargement || {})
          .filter(([, v]) => v)
          .map(([k]) => k.toUpperCase())
          .join(", ") || "None",
      ],
      [
        "Waveform Abnormalities",
        Object.entries(assessment.waveformAbnormalities || {})
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ") || "None",
      ],
      ["Diagnosis", assessment.diagnosis || "—"],
    ]

    // @ts-ignore
    doc.autoTable({
      startY: 46,
      head: [["Field", "Value"]],
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

  useEffect(() => {
    if (students.length && !selectedStudentId) {
      setSelectedStudentId(students[0].id)
    }
  }, [students, selectedStudentId])

  if (!user || user.role !== "teacher") {
    return null
  }

  const totalStudents = students.length
  const activeStudents = studentProgress.filter(
    (p) => p.lastActivity && Date.now() - new Date(p.lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length

  const avgCompletionRate =
    studentProgress.length > 0
      ? studentProgress.reduce((sum, p) => {
          const totalSteps = Object.values(p.stepsAttempted).reduce((s, step) => s + step.attempts, 0)
          const correctSteps = Object.values(p.stepsAttempted).reduce((s, step) => s + step.correct, 0)
          return sum + (totalSteps > 0 ? correctSteps / totalSteps : 0)
        }, 0) / studentProgress.length
      : 0

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
      if (selectedStudentId === studentId) {
        setSelectedStudentId(null)
      }
    } finally {
      setRemovingStudentId(null)
    }
  }

  const selectedStudent = selectedStudentId ? studentList.find((s) => s.id === selectedStudentId) : null

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
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        {studentList.map((student) => (
                          <button
                            key={student.id}
                            className={`w-full text-left rounded-lg border border-border p-3 hover:border-blue-500 transition ${
                              selectedStudentId === student.id ? "border-blue-500 bg-blue-50" : ""
                            }`}
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold flex items-center gap-1">
                                  {student.name || "Unnamed"}
                                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                </p>
                                <p className="text-xs text-muted-foreground">{student.email ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  Class: {student.classroomId ? classroomNameMap.get(student.classroomId) ?? "Unassigned" : "Unassigned"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Last activity:{" "}
                                  {student.progress.lastActivity
                                    ? new Date(student.progress.lastActivity).toLocaleDateString()
                                    : "—"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">
                                  Sims: {student.progress.simulationsCompleted} · Cases: {student.progress.casesCompleted}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Time: {Math.round(student.progress.totalTimeSpent / 60)} min
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleRemoveStudent(student.id, student.classroomId ?? null)
                                  }}
                                  disabled={removingStudentId === student.id}
                                >
                                  {removingStudentId === student.id ? "Removing..." : "Remove"}
                                </Button>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedStudent && (
                        <StudentDetail
                          student={selectedStudent.progress}
                          activities={activities.filter((a) => a.studentId === selectedStudent.id)}
                          assessments={caseSubmissions.filter((s) => s.studentId === selectedStudent.id)}
                          onDownload={handleDownload}
                        />
                      )}
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
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="text-lg font-semibold mb-2">Detail: {student.studentName || "Student"}</h3>
      <div className="grid gap-3 md:grid-cols-4 text-sm">
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Simulations</div>
          <div className="text-xl font-semibold">{student.simulationsCompleted}</div>
        </div>
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Cases</div>
          <div className="text-xl font-semibold">{student.casesCompleted}</div>
        </div>
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Time spent (min)</div>
          <div className="text-xl font-semibold">{Math.round(student.totalTimeSpent / 60)}</div>
        </div>
        <div className="rounded border border-border bg-slate-50 p-3">
          <div className="text-xs text-muted-foreground">Last activity</div>
          <div className="text-xl font-semibold">
            {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : "—"}
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
