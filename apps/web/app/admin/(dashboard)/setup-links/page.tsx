import { listSetupLinks } from "@/server/institution/access"
import { CreateSetupLinkForm } from "@/components/admin/CreateSetupLinkForm"

export default async function SetupLinksPage() {
  const links = await listSetupLinks()

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-8 py-8">
      <CreateSetupLinkForm />

      {/* History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: "#0E0F12" }}>
            Recent Links
          </h3>
          <span className="text-xs" style={{ color: "#9B9A94" }}>
            {links.length} total
          </span>
        </div>

        {!links.length ? (
          <div
            className="rounded-[12px] p-10 text-center text-sm"
            style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#9B9A94" }}
          >
            No links generated yet. Fill out the form above after a call.
          </div>
        ) : (
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ border: "1.5px solid #E8E6DF", backgroundColor: "white" }}
          >
            {/* Table header */}
            <div
              className="grid px-5 py-3 text-[10px] font-semibold uppercase"
              style={{
                letterSpacing: "0.12em",
                color: "#9B9A94",
                borderBottom: "1px solid #F0EEE8",
                gridTemplateColumns: "1fr 180px 120px 100px",
              }}
            >
              <span>Institution</span>
              <span>Contact</span>
              <span>Expires</span>
              <span>Status</span>
            </div>

            {links.map((link: any, i: number) => {
              const isExpired = new Date(link.expires_at) < new Date()
              const isClaimed = !!link.claimed_at
              const statusLabel = isClaimed ? "Claimed" : isExpired ? "Expired" : "Active"
              const statusColor = isClaimed
                ? { color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" }
                : isExpired
                  ? { color: "#9B9A94", bg: "#F8F7F2", border: "#E8E6DF" }
                  : { color: "#0047CC", bg: "#EEF3FF", border: "#C7D9FF" }

              return (
                <div
                  key={link.id}
                  className="grid items-center px-5 py-3.5 text-sm"
                  style={{
                    gridTemplateColumns: "1fr 180px 120px 100px",
                    borderBottom: i < links.length - 1 ? "1px solid #F0EEE8" : "none",
                  }}
                >
                  <div>
                    <p className="font-semibold truncate pr-4" style={{ color: "#0E0F12" }}>
                      {link.institution_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "#9B9A94" }}>
                      {link.institution_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs truncate" style={{ color: "#6B6A65" }}>
                      {link.full_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "#9B9A94" }}>
                      {link.work_email}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "#9B9A94" }}>
                    {new Date(link.expires_at).toLocaleDateString()}
                  </p>
                  <span
                    className="inline-flex w-fit items-center rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      letterSpacing: "0.1em",
                      backgroundColor: statusColor.bg,
                      color: statusColor.color,
                      border: `1px solid ${statusColor.border}`,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
