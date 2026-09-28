"use client"

import { useMemo, useState } from "react"
import { MailPlus } from "lucide-react"

type CourseOption = { id: string; name: string }
type EducatorOption = {
  userId: string
  email: string
  name: string | null
  courseIds: string[]
}

export function StudentInviteForm({
  action,
  courses,
  educators,
  defaultCourseId = ""
}: {
  action: (formData: FormData) => void | Promise<void>
  courses: CourseOption[]
  educators: EducatorOption[]
  defaultCourseId?: string
}) {
  const [courseId, setCourseId] = useState(defaultCourseId)
  const availableEducators = useMemo(
    () => educators.filter((educator) => educator.courseIds.includes(courseId)),
    [courseId, educators]
  )

  return (
    <form action={action} className="mt-5 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Full name</span>
        <input name="name" required autoComplete="name" className="institution-input" placeholder="Morgan Lee" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Email</span>
        <input name="email" type="email" required autoComplete="email" className="institution-input" placeholder="morgan@university.edu" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Class</span>
        <select
          name="course_id"
          required
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="institution-input"
        >
          <option value="">Choose a class</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Responsible educator</span>
        <select name="educator_email" key={courseId} disabled={!courseId} className="institution-input disabled:bg-[#f4f2ec] disabled:text-[#aaa79f]">
          <option value="">{courseId ? "Assign later" : "Choose a class first"}</option>
          {availableEducators.map((educator) => (
            <option key={educator.userId} value={educator.email}>{educator.name || educator.email}</option>
          ))}
        </select>
        {courseId && !availableEducators.length ? <span className="mt-1.5 block text-[11px] leading-4 text-[#8a8881]">No active educator is assigned to this class yet.</span> : null}
      </label>
      <button className="institution-button-primary w-full"><MailPlus className="h-4 w-4" /> Send invitation</button>
    </form>
  )
}
