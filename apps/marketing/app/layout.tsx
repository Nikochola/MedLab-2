import type { Metadata } from "next"
import { Instrument_Sans } from "next/font/google"
import "./globals.css"

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_MARKETING_URL ||
    process.env.MARKETING_URL ||
    "https://medlabinteractive.com"
)

const title = "MedLab | Clinical Reasoning Platform"
const description =
  "Train with interactive ECGs, X-rays, and patient scenarios designed to build real diagnostic confidence."

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
})

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "MedLab",
  title: {
    default: title,
    template: "%s | MedLab",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MedLab",
    title,
    description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MedLab clinical reasoning platform preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} scroll-smooth`}>
      <body className="antialiased" style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", fontFamily: "var(--font-instrument-sans), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
