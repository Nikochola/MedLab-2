import Link from "next/link"
import { revalidatePath } from "next/cache"
import { CalendarDays, Mail, Users, Clock } from "lucide-react"

import {
  approveInstitutionAccessRequestAction,
  rejectInstitutionAccessRequestAction,
  resendInstitutionSetupLinkAction,
  sendInstitutionRequestManualReplyAction,
} from "@/server/actions/institutionAccess"
import {
  listInstitutionAccessRequests,
  listInstitutionRequestEvents,
} from "@/server/institution/access"

function statusColor(status: string) {
  if (status === "approved") return { color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" }
  if (status === "rejected") return { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" }
  return { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" }
}

const filters = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
] as const

type SearchParams = { status?: string }

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const calBookingUrl =
    process.env.NEXT_PUBLIC_CAL_BOOKING_URL ||
    process.env.CAL_BOOKING_URL ||
    "https://www.cal.eu/medlab"
  const resolvedSearchParams =
    searchParams instanceof Promise ? await searchParams : searchParams
  const activeFilter = filters.some((f) => f.value === resolvedSearchParams?.status)
    ? (resolvedSearchParams?.status as "pending" | "approved" | "rejected" | "all")
    : "pending"

  const requests = await listInstitutionAccessRequests(activeFilter)
  const events = requests.length
    ? await listInstitutionRequestEvents(requests.map((r) => r.id))
    : []
  const eventsByRequestId = new Map<string, typeof events>()
  for (const event of events) {
    eventsByRequestId.set(event.request_id, [
      ...(eventsByRequestId.get(event.request_id) || []),
      event,
    ])
  }

  async function approveAction(formData: FormData) {
    "use server"
    await approveInstitutionAccessRequestAction(formData)
    revalidatePath("/admin")
  }

  async function rejectAction(formData: FormData) {
    "use server"
    await rejectInstitutionAccessRequestAction(formData)
    revalidatePath("/admin")
  }

  async function resendAction(formData: FormData) {
    "use server"
    await resendInstitutionSetupLinkAction(formData)
    revalidatePath("/admin")
  }

  async function manualReplyAction(formData: FormData) {
    "use server"
    await sendInstitutionRequestManualReplyAction(formData)
    revalidatePath("/admin")
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8 space-y-5">
      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value
          return (
            <Link
              key={filter.value}
              href={`/admin?status=${filter.value}`}
              className="rounded-[8px] px-3.5 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: isActive ? "#0E0F12" : "white",
                color: isActive ? "white" : "#6B6A65",
                border: isActive ? "1.5px solid #0E0F12" : "1.5px solid #E8E6DF",
              }}
            >
              {filter.label}
            </Link>
          )
        })}
        <span className="ml-auto text-xs" style={{ color: "#9B9A94" }}>
          {requests.length} result{requests.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty */}
      {!requests.length && (
        <div
          className="rounded-[12px] p-12 text-center"
          style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>
            No {activeFilter} requests
          </p>
          <p className="mt-1 text-xs" style={{ color: "#9B9A94" }}>
            Institution requests submitted via your public form will appear here.
          </p>
        </div>
      )}

      {/* Request cards */}
      {requests.map((request) => {
        const sc = statusColor(request.status)
        const reqEvents = eventsByRequestId.get(request.id) || []

        return (
          <article
            key={request.id}
            className="rounded-[12px] overflow-hidden"
            style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid #F0EEE8" }}
            >
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold" style={{ color: "#0E0F12" }}>
                  {request.institution_name}
                </h3>
                <span
                  className="rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    letterSpacing: "0.12em",
                    backgroundColor: sc.bg,
                    color: sc.color,
                    border: `1px solid ${sc.border}`,
                  }}
                >
                  {request.status}
                </span>
                {request.wants_meeting && (
                  <span
                    className="flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{ backgroundColor: "#EEF3FF", color: "#0047CC", border: "1px solid #C7D9FF", letterSpacing: "0.1em" }}
                  >
                    <CalendarDays className="h-2.5 w-2.5" />
                    Meeting
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs" style={{ color: "#9B9A94" }}>
                <Clock className="h-3 w-3" />
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Card body */}
            <div className="flex gap-6 p-6">
              {/* Left: details */}
              <div className="flex-1 space-y-4 min-w-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {[
                    ["Contact", request.full_name],
                    ["Email", request.work_email],
                    ["Type", request.institution_type],
                    ["Est. students", String(request.estimated_students)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm truncate" style={{ color: "#0E0F12" }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {request.wants_meeting && (
                  <div
                    className="flex items-center gap-3 rounded-[8px] px-4 py-3 text-sm"
                    style={{ backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0" style={{ color: "#0066FF" }} />
                    <span style={{ color: "#0047CC" }}>
                      Meeting requested —{" "}
                      <a href={calBookingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                        Open Cal.com
                      </a>
                    </span>
                  </div>
                )}

                {request.message && (
                  <div className="rounded-[8px] px-4 py-3" style={{ backgroundColor: "#F8F7F2" }}>
                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>Message</p>
                    <p className="text-sm" style={{ color: "#6B6A65" }}>{request.message}</p>
                  </div>
                )}

                {request.rejection_reason && (
                  <div className="rounded-[8px] px-4 py-3" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: "0.1em", color: "#B91C1C" }}>Rejection reason</p>
                    <p className="text-sm" style={{ color: "#991B1B" }}>{request.rejection_reason}</p>
                  </div>
                )}

                {reqEvents.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>
                      Event log ({reqEvents.length})
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {reqEvents.slice(0, 8).map((event) => (
                        <div
                          key={event.id}
                          className="rounded-[7px] px-3 py-2"
                          style={{ backgroundColor: "#F8F7F2", border: "1px solid #E8E6DF" }}
                        >
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.08em", color: "#9B9A94" }}>
                            <span>{event.event_type.replaceAll("_", " ")}</span>
                            <span>·</span>
                            <span>{event.channel}</span>
                            <span>·</span>
                            <span>{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                          {event.subject && <p className="mt-0.5 text-xs font-semibold" style={{ color: "#0E0F12" }}>{event.subject}</p>}
                          {event.actor_email && <p className="text-[10px]" style={{ color: "#9B9A94" }}>by {event.actor_email}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Right: actions */}
              <div className="w-56 shrink-0 space-y-3">
                {request.status === "pending" && (
                  <>
                    <form action={approveAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button
                        type="submit"
                        className="flex h-10 w-full items-center justify-center rounded-[9px] text-sm font-semibold text-white transition-transform active:translate-y-[3px] active:shadow-none"
                        style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}
                      >
                        Approve & Send Link
                      </button>
                    </form>

                    <form action={rejectAction} className="space-y-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <textarea
                        name="reason"
                        rows={2}
                        placeholder="Optional rejection reason"
                        className="w-full rounded-[9px] px-3 py-2 text-sm outline-none resize-none"
                        style={{ border: "1.5px solid #E8E6DF", backgroundColor: "#F8F7F2", color: "#0E0F12" }}
                      />
                      <button
                        type="submit"
                        className="flex h-10 w-full items-center justify-center rounded-[9px] text-sm font-semibold transition-transform active:translate-y-[3px] active:shadow-none"
                        style={{ backgroundColor: "white", color: "#B91C1C", border: "1.5px solid #FECACA", boxShadow: "0 3px 0 #FECACA" }}
                      >
                        Reject
                      </button>
                    </form>
                  </>
                )}

                {request.status === "approved" && (
                  <form action={resendAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold transition-transform active:translate-y-[3px] active:shadow-none"
                      style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF", boxShadow: "0 3px 0 #E8E6DF" }}
                    >
                      <Mail className="h-4 w-4" />
                      Resend Link
                    </button>
                  </form>
                )}

                <details>
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>
                    Manual reply
                  </summary>
                  <form action={manualReplyAction} className="mt-2 space-y-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input
                      name="subject"
                      defaultValue={`MedLab update for ${request.institution_name}`}
                      className="w-full rounded-[9px] px-3 py-2 text-sm outline-none"
                      style={{ border: "1.5px solid #E8E6DF", backgroundColor: "#F8F7F2", color: "#0E0F12" }}
                    />
                    <textarea
                      name="body"
                      rows={4}
                      defaultValue={`Hello ${request.full_name},\n\nThanks for your interest in MedLab.`}
                      className="w-full rounded-[9px] px-3 py-2 text-sm outline-none resize-none"
                      style={{ border: "1.5px solid #E8E6DF", backgroundColor: "#F8F7F2", color: "#0E0F12" }}
                    />
                    <button
                      type="submit"
                      className="flex h-9 w-full items-center justify-center rounded-[9px] text-sm font-semibold transition-transform active:translate-y-[3px] active:shadow-none"
                      style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF", boxShadow: "0 3px 0 #E8E6DF" }}
                    >
                      Send Reply
                    </button>
                  </form>
                </details>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
