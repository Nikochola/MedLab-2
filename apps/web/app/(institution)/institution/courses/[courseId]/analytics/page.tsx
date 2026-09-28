import { redirect } from "next/navigation"

export default function CourseAnalyticsPage({ params }: { params: { courseId: string } }) {
  redirect(`/institution/analytics?courseId=${encodeURIComponent(params.courseId)}`)
}
