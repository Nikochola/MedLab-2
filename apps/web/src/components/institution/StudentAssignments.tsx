"use client"

import Link from "next/link"
import { ArrowRight, CalendarClock, ClipboardList } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type AssignedCase = { id: string; title: string; modality: string; difficulty: string; durationMin: number; href: string }
type Assignment = { id: string; title: string; instructions: string | null; dueAt: string | null; courseName: string; status: string; cases: AssignedCase[] }

export function StudentAssignments() {
  const { data } = useSWR<{ assignments: Assignment[] }>("/api/student/assignments", fetcher)
  const assignments = data?.assignments || []
  if (!assignments.length) return null

  return (
    <section className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">Assigned by your educator</p>
      <div className="mt-3 space-y-3">
        {assignments.map((assignment) => (
          <article key={assignment.id} className="overflow-hidden rounded-2xl border border-[#C7D9FF] bg-[#F7FAFF]">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#0066FF]" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4D8AFF]">{assignment.courseName}</span></div>
                <h2 className="mt-2 text-[15px] font-semibold text-[#0E0F12]">{assignment.title}</h2>
                {assignment.instructions ? <p className="mt-1 text-xs leading-5 text-[#6B6A65]">{assignment.instructions}</p> : null}
              </div>
              <div className="shrink-0 text-left sm:text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${assignment.status === "COMPLETED" ? "bg-[#EAF8ED] text-[#24713A]" : "bg-white text-[#0066FF]"}`}>{assignment.status.replace("_", " ")}</span>{assignment.dueAt ? <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#7A7770] sm:flex"><CalendarClock className="h-3 w-3" />{new Date(assignment.dueAt).toLocaleDateString()}</p> : null}</div>
            </div>
            <div className="grid gap-px border-t border-[#D9E4FF] bg-[#D9E4FF] sm:grid-cols-2">
              {assignment.cases.map((item) => <Link key={item.id} href={item.href} className="group flex items-center justify-between gap-3 bg-white px-4 py-3.5"><div><p className="text-xs font-semibold text-[#252521]">{item.title}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#9B9A94]">{item.modality} · {item.difficulty} · {item.durationMin} min</p></div><ArrowRight className="h-4 w-4 shrink-0 text-[#9B9A94] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0066FF]" /></Link>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
