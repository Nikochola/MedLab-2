import type { Metadata } from "next"
import { Instrument_Sans } from "next/font/google"
import "./globals.css"

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
})

export const metadata: Metadata = {
  title: "MedLab | Clinical Reasoning Platform",
  description: "AI-powered medical simulation platform for clinical reasoning.",
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
