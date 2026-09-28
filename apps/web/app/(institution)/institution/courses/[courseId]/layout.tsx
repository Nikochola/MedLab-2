import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

import { getSessionWithRole } from "@/server/auth/session"
import { getCourseById, requireInstitutionRole, userCanAccessCourse } from "@/server/institution"

interface CourseLayoutProps {
  children: ReactNode
  params: { courseId: string }
}

export default async function CourseLayout({ children, params }: CourseLayoutProps) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect(`/institution/login?next=/institution/courses/${params.courseId}/students`)
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
      <div className="institution-panel p-5">
        <Link href="/institution/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#77746d]"><ArrowLeft className="h-3.5 w-3.5" /> All classes</Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="institution-eyebrow">Class workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#0e0f12]">{ensuredCourse.name}</h1><p className="mt-1 text-xs text-[#8a8881]">{ensuredCourse.code || "No class code"}</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/institution/courses/${ensuredCourse.id}/students`} className="institution-button-secondary h-9 px-3 text-xs">Roster & CSV</Link>
            <Link href={`/institution/assignments?courseId=${ensuredCourse.id}`} className="institution-button-secondary h-9 px-3 text-xs">Assignments</Link>
            <Link href={`/institution/analytics?courseId=${ensuredCourse.id}`} className="institution-button-secondary h-9 px-3 text-xs">Analytics</Link>
          </div>
        </div>
      </div>
      {children}
    </main>
  )
}
