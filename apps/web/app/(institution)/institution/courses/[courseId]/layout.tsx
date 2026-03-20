import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { ReactNode } from "react"

import { getSessionWithRole } from "@/server/auth/session"
import { getCourseById, requireInstitutionRole, userCanAccessCourse } from "@/server/institution"

interface CourseLayoutProps {
  children: ReactNode
  params: { courseId: string }
}

export default async function CourseLayout({ children, params }: CourseLayoutProps) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect(`/login?next=/institution/courses/${params.courseId}/students`)
  }
  const ensuredSession = sessionWithRole

  const context = await requireInstitutionRole(ensuredSession.session.user.id, ["INSTITUTION_ADMIN", "EDUCATOR"])

  const course = await getCourseById(params.courseId)

  if (!course || course.institution_id !== context.institution.id) {
    notFound()
  }
  const ensuredCourse = course

  const canAccess = await userCanAccessCourse({
    courseId: ensuredCourse.id,
    userId: ensuredSession.session.user.id,
    institutionRole: context.membership.role
  })

  if (!canAccess) {
    redirect("/institution/courses")
  }

  return (
    <main className="space-y-4">
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Course</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{ensuredCourse.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Code: {ensuredCourse.code || "—"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/institution/courses/${ensuredCourse.id}/students`} className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200">
            Students
          </Link>
          <Link href={`/institution/courses/${ensuredCourse.id}/educators`} className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200">
            Educators
          </Link>
          <Link href={`/institution/courses/${ensuredCourse.id}/analytics`} className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200">
            Analytics
          </Link>
        </div>
      </div>
      {children}
    </main>
  )
}
