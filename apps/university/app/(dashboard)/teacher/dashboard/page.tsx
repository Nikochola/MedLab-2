"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ClassroomManager } from "@/components/teacher/ClassroomManager"
import { Classroom, StudentProgress, StudentActivity } from "@/lib/types"
import { getTeacherClassrooms, getClassroomProgress, getStudentActivities, getCaseAssessmentsByTeacher } from "@/lib/storage"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Activity, TrendingUp, FileText, Download } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [caseSubmissions, setCaseSubmissions] = useState<any[]>([])
  const [activities, setActivities] = useState<StudentActivity[]>([])

  const handleDownload = (submission: any) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Case Assessment", 14, 18)
    doc.setFontSize(12)
    doc.text(`Student: ${submission.studentName || "N/A"}`, 14, 26)
    doc.text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, 14, 32)
    doc.text(`Classroom: ${submission.classroomId || "—"}`, 14, 38)
    doc.text("Powered by Medlab Interactive", 14, 44)

    const assessment = submission.assessment || {}
    const rows = [
      ["Rate (bpm)", assessment.rate || "—"],
      ["Rhythm", assessment.rhythm || "—"],
      ["PR (ms)", assessment.prInterval || "—"],
      ["QRS (ms)", assessment.qrsInterval || "—"],
      ["QT (ms)", assessment.qtInterval || "—"],
      ["Axis", assessment.axis || "—"],
      ["Chamber Enlargement", Object.entries(assessment.chamberEnlargement || {}).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(", ") || "None"],
      ["Waveform Abnormalities", Object.entries(assessment.waveformAbnormalities || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "None"],
      ["Diagnosis", assessment.diagnosis || "—"],
    ]

    // @ts-ignore
    doc.autoTable({
      startY: 46,
      head: [["Field", "Value"]],
      body: rows,
      styles: { fontSize: 10 },
    })

    doc.save(`medlab-assessment-${submission.studentName || "student"}.pdf`)
  }

  useEffect(() => {
    if (user?.role === "teacher" && user.id) {
      const load = async () => {
        const teacherClassrooms = await getTeacherClassrooms(user.id)
        setClassrooms(teacherClassrooms)
        if (teacherClassrooms.length > 0) {
          setSelectedClassroom(teacherClassrooms[0])
        }
      }
      load()
    }
  }, [user])

  useEffect(() => {
    if (selectedClassroom) {
      const load = async () => {
        const progress = await getClassroomProgress(selectedClassroom.id)
        setStudentProgress(progress)
        const submissions = (await getCaseAssessmentsByTeacher(user?.id || "")).filter(
          (s) => s.classroomId === selectedClassroom.id
        )
        setCaseSubmissions(submissions)
        const acts = await getStudentActivities(selectedClassroom.id)
        setActivities(acts)
      }
      load()
    }
  }, [selectedClassroom, user?.id])

  const handleClassroomUpdate = async () => {
    if (user?.id) {
      const updatedClassrooms = await getTeacherClassrooms(user.id)
      setClassrooms(updatedClassrooms)
    }
  }

  if (!user || user.role !== "teacher") {
    return null
  }

  const totalStudents = studentProgress.length
  const activeStudents = studentProgress.filter(
    (p) => Date.now() - new Date(p.lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length

  const avgCompletionRate =
    studentProgress.length > 0
      ? studentProgress.reduce((sum, p) => {
          const totalSteps = Object.values(p.stepsAttempted).reduce(
            (s, step) => s + step.attempts,
            0
          )
          const correctSteps = Object.values(p.stepsAttempted).reduce(
            (s, step) => s + step.correct,
            0
          )
          return sum + (totalSteps > 0 ? correctSteps / totalSteps : 0)
        }, 0) / studentProgress.length
      : 0

  return (
    <ProtectedRoute requiredRole="teacher">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage classrooms and review analytics.</p>
          </div>
          <Tabs defaultValue="students" className="space-y-6">
            <TabsContent value="simulations" className="space-y-6">
              <Card>
                <CardContent className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground max-w-xl">
                    Explore both simulation and case-based modes exactly as students see them, without affecting student tracking data.
                  </div>
                  <Button asChild size="lg" className="uppercase">
                    <Link href="/teacher/simulations">
                      <Activity className="h-4 w-4 mr-2" />
                      Open ECG Lab
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-6">
              <Tabs defaultValue="classrooms" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="assessments">Case Assessments</TabsTrigger>
                </TabsList>

                <TabsContent value="classrooms" className="space-y-6">
                  <ClassroomManager
                    teacherId={user.id}
                    teacherName={user.name}
                    classrooms={classrooms}
                    onClassroomUpdate={handleClassroomUpdate}
                  />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  {selectedClassroom ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{totalStudents}</div>
                            <p className="text-xs text-muted-foreground">
                              {activeStudents} active this week
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Completion Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {(avgCompletionRate * 100).toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Across all students
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{activities.length}</div>
                            <p className="text-xs text-muted-foreground">
                              Total activities tracked
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Student Progress</CardTitle>
                          <CardDescription>
                            Detailed progress for {selectedClassroom.name}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {studentProgress.length > 0 ? (
                            <div className="space-y-4">
                              {studentProgress.map((progress) => (
                                <div
                                  key={progress.studentId}
                                  className="p-4 border border-border rounded-lg"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">{progress.studentName}</h3>
                                    <span className="text-sm text-muted-foreground">
                                      {progress.simulationsCompleted} simulations,{" "}
                                      {progress.casesCompleted} cases
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Total time: {Math.round(progress.totalTimeSpent / 60)} minutes
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No student progress data yet.</p>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          Create a classroom first to view analytics.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="assessments" className="space-y-6">
                  {caseSubmissions.length ? (
                    <div className="space-y-3">
                      {caseSubmissions.map((submission) => {
                        const assessment = submission.assessment || {}
                        const refFindings = (() => {
                          try {
                            return submission.ecgFindings ? JSON.parse(submission.ecgFindings) : {}
                          } catch {
                            return {}
                          }
                        })()

                        const chamberFlags = assessment.chamberEnlargement
                          ? Object.entries(assessment.chamberEnlargement)
                              .filter(([, v]: any) => v)
                              .map(([k]: any) => k.toUpperCase())
                              .join(", ")
                          : ""
                        const refChamberFlags = refFindings?.chamberEnlargement
                          ? Object.entries(refFindings.chamberEnlargement)
                              .filter(([, v]: any) => v)
                              .map(([k]: any) => k.toUpperCase())
                              .join(", ")
                          : ""

                        const waveFlags = assessment.waveformAbnormalities
                          ? Object.entries(assessment.waveformAbnormalities)
                              .filter(([, v]: any) => v)
                              .map(([k]: any) => k)
                              .join(", ")
                          : ""
                        const refWaveFlags = refFindings?.waveformAbnormalities
                          ? Object.entries(refFindings.waveformAbnormalities)
                              .filter(([, v]: any) => v)
                              .map(([k]: any) => k)
                              .join(", ")
                          : ""

                        return (
                          <Card key={submission.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  {submission.studentName}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  Submitted {new Date(submission.submittedAt).toLocaleString()}
                                </CardDescription>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                
                              <Button
                                variant="tritary"
                                size="sm"
                                className="ml-3 flex items-center gap-2"
                                onClick={() => handleDownload(submission)}
                              >
                                <Download className="h-4 w-4" />
                                PDF
                              </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                <div>
                                  <span className="font-semibold text-foreground">Rate:</span> {assessment.rate || "—"} bpm
                                  <div className="text-xs text-muted-foreground">Ref: {refFindings.rate || "—"} bpm</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-foreground">Rhythm:</span> {assessment.rhythm || "—"}
                                  <div className="text-xs text-muted-foreground">Ref: {refFindings.rhythm || "—"}</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-foreground">PR:</span> {assessment.prInterval || "—"} ms
                                  <div className="text-xs text-muted-foreground">Ref: {refFindings.prInterval || "—"} ms</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-foreground">QRS:</span> {assessment.qrsInterval || "—"} ms
                                  <div className="text-xs text-muted-foreground">Ref: {refFindings.qrsInterval || "—"} ms</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-foreground">QT:</span> {assessment.qtInterval || "—"} ms
                                  <div className="text-xs text-muted-foreground">Ref: {refFindings.qtInterval || "—"} ms</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-foreground">Axis:</span> {assessment.axis || "—"}
                                  <div className="text-xs text-muted-foreground">Ref: {refFindings.axis || "—"}</div>
                                </div>
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-semibold text-foreground">Chamber enlargement:</span>{" "}
                                {chamberFlags || "None"}
                                <div className="text-xs text-muted-foreground">Ref: {refChamberFlags || "None"}</div>
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-semibold text-foreground">Waveform abnormalities:</span>{" "}
                                {waveFlags || "None"}
                                <div className="text-xs text-muted-foreground">Ref: {refWaveFlags || "None"}</div>
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-semibold text-foreground">Diagnosis:</span>{" "}
                                {assessment.diagnosis || "—"}
                                <div className="text-xs text-muted-foreground">
                                  Ref: {refFindings.diagnosis || "—"}
                                </div>
                                <div className="mt-10"><span >{submission.classroomId ? `Classroom: ${submission.classroomId}` : "No classroom"}</span></div>
                                
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No case-based assessments submitted yet for this classroom.
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
