import Link from "next/link"
import { revalidatePath } from "next/cache"

import {
  approveInstitutionAccessRequestAction,
  rejectInstitutionAccessRequestAction,
  resendInstitutionSetupLinkAction,
  sendInstitutionRequestManualReplyAction
} from "@/server/actions/institutionAccess"
import { requireMedlabTeamAccess } from "@/server/internal/medlabTeam"
import { listInstitutionAccessRequests, listInstitutionRequestEvents } from "@/server/institution/access"

function statusClasses(status: string) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800"
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-800"
  }

  return "bg-amber-100 text-amber-900"
}

const filters = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" }
] as const

type SearchParams = {
  status?: string
}

export default async function InstitutionRequestsPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const calBookingUrl = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || process.env.CAL_BOOKING_URL || "https://www.cal.eu/medlab"
  await requireMedlabTeamAccess()
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
  const activeFilter = filters.some((filter) => filter.value === resolvedSearchParams?.status)
    ? (resolvedSearchParams?.status as "pending" | "approved" | "rejected" | "all")
    : "pending"
  const requests = await listInstitutionAccessRequests(activeFilter)
  const events = requests.length
    ? await listInstitutionRequestEvents(requests.map((request) => request.id))
    : []
  const eventsByRequestId = new Map<string, typeof events>()

  for (const event of events) {
    eventsByRequestId.set(event.request_id, [...(eventsByRequestId.get(event.request_id) || []), event])
  }

  async function approveAction(formData: FormData) {
    "use server"

    await approveInstitutionAccessRequestAction(formData)
    revalidatePath("/internal/institution-requests")
  }

  async function rejectAction(formData: FormData) {
    "use server"

    await rejectInstitutionAccessRequestAction(formData)
    revalidatePath("/internal/institution-requests")
  }

  async function resendAction(formData: FormData) {
    "use server"

    await resendInstitutionSetupLinkAction(formData)
    revalidatePath("/internal/institution-requests")
  }

  async function manualReplyAction(formData: FormData) {
    "use server"

    await sendInstitutionRequestManualReplyAction(formData)
    revalidatePath("/internal/institution-requests")
  }

  return (
    <main className="space-y-6 px-6 py-8">
      <section className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Internal</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Institution Access Requests</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review incoming institution requests, approve setup access, or reject submissions that are not a fit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value

            return (
              <Link
                key={filter.value}
                href={`/internal/institution-requests?status=${filter.value}`}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        {!requests.length ? (
          <article className="surface-card p-6 text-sm text-slate-600">
            No requests found for the <strong className="text-slate-900">{activeFilter}</strong> filter.
          </article>
        ) : null}
        {requests.map((request) => (
          <article key={request.id} className="surface-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">{request.institution_name}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusClasses(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p><strong className="text-slate-900">Requester:</strong> {request.full_name}</p>
                  <p><strong className="text-slate-900">Work email:</strong> {request.work_email}</p>
                  <p><strong className="text-slate-900">Institution type:</strong> {request.institution_type}</p>
                  <p><strong className="text-slate-900">Estimated students:</strong> {request.estimated_students}</p>
                  <p><strong className="text-slate-900">Meeting requested:</strong> {request.wants_meeting ? "Yes" : "No"}</p>
                  <p><strong className="text-slate-900">Submitted:</strong> {new Date(request.created_at).toLocaleString()}</p>
                  <p><strong className="text-slate-900">Reviewed by:</strong> {request.reviewed_by_email || "—"}</p>
                </div>
                {request.wants_meeting ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    <strong>Scheduling requested:</strong>{" "}
                    <a href={calBookingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                      Open Cal.com
                    </a>
                  </div>
                ) : null}
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-slate-900">Message:</strong> {request.message || "No message provided."}
                </div>
                {request.rejection_reason ? (
                  <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                    <strong>Rejection reason:</strong> {request.rejection_reason}
                  </div>
                ) : null}
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-slate-900">Event log</strong>
                  <div className="mt-3 space-y-2">
                    {(eventsByRequestId.get(request.id) || []).slice(0, 8).map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <span>{event.event_type.replaceAll("_", " ")}</span>
                          <span>•</span>
                          <span>{event.channel}</span>
                          <span>•</span>
                          <span>{new Date(event.created_at).toLocaleString()}</span>
                        </div>
                        {event.subject ? <p className="mt-1 text-sm font-semibold text-slate-900">{event.subject}</p> : null}
                        {event.body_excerpt ? <p className="mt-1 text-sm text-slate-600">{event.body_excerpt}</p> : null}
                        {event.actor_email ? <p className="mt-1 text-xs text-slate-500">By {event.actor_email}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full max-w-sm space-y-3">
                {request.status === "pending" ? (
                  <form action={approveAction} className="space-y-3">
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Approve And Send Setup Link
                    </button>
                  </form>
                ) : null}

                {request.status === "pending" ? (
                  <form action={rejectAction} className="space-y-3">
                    <input type="hidden" name="requestId" value={request.id} />
                    <textarea
                      name="reason"
                      rows={3}
                      placeholder="Optional rejection reason"
                      className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Reject Request
                    </button>
                  </form>
                ) : null}

                {request.status === "approved" ? (
                  <form action={resendAction} className="space-y-3">
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Resend Setup Link
                    </button>
                  </form>
                ) : null}

                <form action={manualReplyAction} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input type="hidden" name="requestId" value={request.id} />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Manual Reply</p>
                  <input
                    name="subject"
                    defaultValue={`MedLab request update for ${request.institution_name}`}
                    className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm"
                  />
                  <textarea
                    name="body"
                    rows={6}
                    defaultValue={`Hello ${request.full_name},

Thanks for your interest in MedLab. Reply to this email with any additional context and our team will follow up.`}
                    className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Send Reply
                  </button>
                </form>

                {request.status !== "pending" ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {request.status === "approved"
                      ? `Setup link sent ${request.setup_link_sent_at ? new Date(request.setup_link_sent_at).toLocaleString() : "recently"}.`
                      : `Rejected ${request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : "recently"}.`}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
