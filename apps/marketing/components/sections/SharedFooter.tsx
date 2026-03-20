import Link from "next/link"

export function SharedFooter() {
  return (
    <footer
      className="flex flex-col md:grid md:grid-cols-3 items-center gap-4 px-5 md:px-[80px]"
      style={{ borderTop: "1px solid #E8E6DF", paddingTop: 32, paddingBottom: 32 }}
    >
      <Link href="/">
        <img src="/logo.svg" alt="MedLab" style={{ height: 18 }} />
      </Link>
      <p style={{ fontSize: 13, color: "#9B9A94", margin: 0 }} className="text-center">© 2026 MedLab</p>
      <div className="flex items-center justify-end gap-6">
        {[
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms of Service", href: "/terms" },
        ].map(({ label, href }) => (
          <Link key={label} href={href} style={{ fontSize: 13, color: "#9B9A94" }} className="hover:text-[#0E0F12] transition-colors">
            {label}
          </Link>
        ))}
      </div>
    </footer>
  )
}
