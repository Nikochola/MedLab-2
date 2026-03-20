import type { Metadata } from "next"
import { Instrument_Sans } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"
import { CookieConsent } from "@/components/CookieConsent"
import { AuthProvider } from "@/contexts/AuthContext"
import { GatingProvider } from "@/contexts/GatingContext"

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
})

export const metadata: Metadata = {
  title: "MedLab",
  description: "Unified MedLab product"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} antialiased`}>
        <AuthProvider>
          <GatingProvider>
            {children}
            <Toaster richColors position="top-center" />
          </GatingProvider>
        </AuthProvider>
        <CookieConsent />
      </body>
    </html>
  )
}
