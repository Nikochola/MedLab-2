"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, BookOpen, Stethoscope, ArrowRight } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="inline-block">
            <div className="mb-8 flex justify-center">
              <Image src="/images/logo_black.svg" alt="MedLab Logo" width={150} height={50} />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Master ECG
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-300">
              Interpretation
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Interactive ECG teaching simulation designed for medical students and healthcare professionals.
            Learn at your own pace with guided tutorials and clinical cases.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="tritary"
              onClick={() => router.push("/login")}
            >
              Log in
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mt-24">
          <Card className="border-border bg-white hover:border-blue-500 transition-all duration-300 shadow-sm">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Stethoscope className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>ECG Simulation Mode</CardTitle>
              <CardDescription>
                Step-by-step guided interpretation with an interactive doctor tutor.
                Learn each component of ECG analysis systematically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Heart rate calculation
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Rhythm analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Waveform interpretation
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Real-time feedback & hints
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-white hover:border-blue-500 transition-all duration-300 shadow-sm">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Case-Based Learning</CardTitle>
              <CardDescription>
                Practice with realistic clinical scenarios. Work through patient cases
                and complete comprehensive ECG assessments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Real patient scenarios
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Clinical context & history
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Comprehensive assessment forms
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Self-paced learning
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="container mx-auto px-4 py-16"> <p className="text-center text-sm text-muted-foreground">
        © 2026 ForECGLearner & MedLab Interactive. All rights reserved.
        </p></div>
       
      </div>
    </div>
  )
}
