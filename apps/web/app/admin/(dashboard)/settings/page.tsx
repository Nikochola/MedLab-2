export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8 space-y-6">
      <div>
        <p
          className="text-xs font-semibold uppercase"
          style={{ letterSpacing: "0.16em", color: "#9B9A94" }}
        >
          Platform
        </p>
        <h2 className="mt-1 text-2xl font-bold" style={{ color: "#0E0F12" }}>
          Settings
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#6B6A65" }}>
          Platform-wide configuration. Coming soon.
        </p>
      </div>

      <div
        className="rounded-[12px] p-8 text-center text-sm"
        style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#6B6A65" }}
      >
        Settings will be available here once more configuration options are added.
      </div>
    </div>
  )
}
