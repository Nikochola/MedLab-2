"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/Logo"
import { ECGPreview } from "@/components/marketing/ECGPreview"
import RoughUnderline from "@/components/RoughUnderline"
import RoughCircle from "@/components/RoughCircle"
import { Check, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Essential foundations for every medical student.",
    features: [
      "Access to core ECG practice",
      "Standard interpretion feedback",
      "3 simulations per day",
      "Basic progress tracking",
      "Community support",
    ],
    cta: "Start Practice",
    href: "/login",
    pro: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "The complete clinical workbench for total mastery.",
    features: [
      "Unlimited ECG simulations",
      "Full Case-Based Lab access",
      "Advanced clinical reasoning logs",
      "Detailed mastery analytics",
      "All future modules included",
      "Priority educator support",
    ],
    cta: "Unlock Full Access",
    href: "https://polar.sh/nikochola", // Link to Polar store
    pro: true,
  },
]

const socialProof = [
  "Designed with physicians",
  "Evidence-based learning",
  "Built for medical students",
]

const features = [
  {
    title: "Interactive simulations",
    description: "Practice clinical skills with guided feedback and real-time coaching.",
    className: "md:col-span-2",
    gradient: "from-blue-500/10 to-indigo-500/10",
  },
  {
    title: "Case-based learning",
    description: "Apply knowledge through realistic patient scenarios.",
    className: "md:col-span-1",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    title: "High-fidelity visuals",
    description: "Study with crystal-clear medical imaging and tracing tools.",
    className: "md:col-span-1",
    gradient: "from-cyan-500/10 to-blue-500/10",
  },
  {
    title: "Progress tracking",
    description: "Monitor your mastery across clinical competencies with detailed analytics.",
    className: "md:col-span-2",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
]

const steps = [
  {
    title: "Sign in and explore",
    description: "Access a clean, distraction-free learning environment built for focus.",
  },
  {
    title: "Practice with guidance",
    description: "Get step-by-step feedback as you work through clinical scenarios.",
  },
  {
    title: "Master core skills",
    description: "Build confidence across the clinical competencies that matter most.",
  },
]

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white text-slate-900">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.015]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm",
          // Force visible text in production even if a global `text-transparent`/opacity style wins
          "text-slate-900 opacity-100",
          "[color:rgb(15,23,42)]",
          "[&_*]:!opacity-100 [&_*]:!text-slate-900",
          "[&_svg]:!text-slate-900"
        )}
        style={{ color: "rgb(15, 23, 42)" }}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <Logo width={120} height={34} />
            </Link>
          </div>

          {/* Navigation - centered on desktop */}
          <nav className="hidden lg:flex items-center gap-10 text-sm font-semibold">
            <a href="#features" className="transition-colors hover:text-slate-700">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-700">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-slate-700">Pricing</a>
          </nav>

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="lg" className="font-semibold !text-slate-900">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="tritary" size="lg" className="font-bold shadow-lg shadow-blue-200 !text-white">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section - Clean & Centered */}
        <section className="relative px-6 pt-16 pb-24 md:pt-20 md:pb-32 overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-violet-200/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center">
              {/* Badge with enhanced styling */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 backdrop-blur-sm shadow-lg shadow-blue-100/50"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                </span>
                <span className="text-sm font-medium text-blue-500 ">Designed for medical students</span>
              </motion.div>

              {/* Main Headline with enhanced gradient */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8 max-w-4xl text-xl font-black tracking-tight md:text-7xl"
              >
                <span className="relative inline-block">
                  <span className="text-black">
                    Build real&nbsp;
                  </span>
                  <RoughCircle>
                    <span className="text-blue-500">
                      clinical confidence
                    </span>
                  </RoughCircle>
                </span>
                <br />
                <span className="relative inline-block mt-2">
                  <span className="text-black">
                    — one case at a time
                  </span>
                </span>
              </motion.h1>

              {/* Subheadline with accent highlights */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-12 max-w-3xl text-xl text-slate-600 md:text-2xl leading-relaxed"
              >
                A focused learning environment for{" "}
                <span className="relative inline-flex">
                  <span className="relative underline font-semibold text-blue-500">
                    <RoughUnderline color="#ffcc00ff" strokeWidth={3} padding={1}>
                      medical students&nbsp;
                    </RoughUnderline>
                  </span>
                </span>
                to practice diagnostic reasoning, interpret real studies, and think like clinicians.
              </motion.p>

              {/* CTA Buttons with enhanced spacing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-4 mb-6"
              >
                <Button
                  asChild
                  size="lg"
                  variant="tritary"
                >
                  <Link href="/login">Practice your first case</Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="default"
                >
                  <Link href="/demo">See the workbench</Link>
                </Button>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 mb-16"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span>Trusted by Medical Students and Universities</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>4.9/5 rating</span>
                </div>
              </motion.div>

              {/* App Preview with enhanced effects */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="relative w-full"
              >
                <div className="absolute -inset-12 rounded-[3rem] bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 opacity-20 blur-3xl" />
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-[2.5rem] opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500" />
                  <ECGPreview />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y border-slate-200/60 bg-slate-50/50">
          <div className="container mx-auto px-6 py-12">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex flex-wrap items-center justify-center gap-12 md:gap-20"
            >
              {socialProof.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-sm font-semibold text-slate-600"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features - Clean Grid */}
        <section id="features" className="py-24 md:py-32">
          <div className="container mx-auto max-w-6xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 text-center"
            >
              <h2 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Everything you need to succeed
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-600">
                A comprehensive platform designed for the modern medical student.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={feature.className}
                >
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className="group h-full overflow-hidden border-slate-200/60 bg-white shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      <CardHeader className="relative border-b border-slate-50 bg-slate-50/50 p-6 md:p-8">
                        <motion.div
                          whileHover={{ rotate: 5, scale: 1.05 }}
                          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50"
                        >
                          <div className="h-5 w-5 rounded-full bg-white/40" />
                        </motion.div>
                        <CardTitle className="text-xl font-bold text-slate-900">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="relative p-6 md:p-8">
                        <p className="text-base leading-relaxed text-slate-600">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-y border-slate-200/60 bg-slate-50/50 py-24 md:py-32">
          <div className="container mx-auto max-w-5xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20 text-center"
            >
              <h2 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Your learning journey
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-600">
                A simple, effective approach to mastering clinical skills.
              </p>
            </motion.div>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card className="overflow-hidden border-slate-200/60 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start gap-6 p-8">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 font-black text-xl text-white shadow-lg shadow-blue-200/50"
                      >
                        {index + 1}
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="mb-2 text-xl font-bold text-slate-900">{step.title}</h3>
                        <p className="text-base leading-relaxed text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 md:py-32 bg-white">
          <div className="container mx-auto max-w-6xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20 text-center"
            >
              <h2 className="mb-4 text-4xl font-black tracking-tight md:text-5xl text-slate-900">
                Simple, student-first pricing
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-600">
                Invest in your clinical future with a plan that scales with your training.
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={cn(
                    "relative h-full overflow-hidden border-slate-200 bg-white transition-all duration-300",
                    plan.pro ? "ring-2 ring-blue-500 shadow-xl shadow-blue-100/50" : "shadow-sm hover:shadow-md"
                  )}>
                    {plan.pro && (
                      <div className="absolute top-0 right-0 rounded-bl-xl bg-blue-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                        Most Popular
                      </div>
                    )}

                    <CardHeader className="p-8 pb-0">
                      <div className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-600">
                        {plan.name}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                        {plan.period && <span className="text-slate-500 font-medium">{plan.period}</span>}
                      </div>
                      <p className="mt-4 text-slate-600 leading-relaxed font-medium">
                        {plan.description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-8">
                      <ul className="mb-8 space-y-4">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </div>
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        size="lg"
                        variant={plan.pro ? "tritary" : "default"}
                        className={cn(
                          "w-full rounded-2xl h-14 text-base font-bold transition-all duration-300",
                          plan.pro ? "shadow-lg shadow-blue-200" : ""
                        )}
                      >
                        <Link href={plan.href} target={plan.pro ? "_blank" : undefined}>
                          {plan.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-12 text-center text-sm text-slate-500"
            >
              Have a clinical group or university inqury? <Link href="#" className="font-semibold text-blue-600 hover:underline">Contact sales</Link>
            </motion.p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <Logo width={90} height={26} />
              <div className="h-4 w-px bg-slate-300" />
              <p className="text-sm text-slate-500">© 2024 MedLab Education</p>
            </div>

            <div className="flex gap-8 text-sm font-medium text-slate-600">
              <Link href="#" className="transition-colors hover:text-slate-900">Privacy Policy</Link>
              <Link href="#" className="transition-colors hover:text-slate-900">Terms of Service</Link>
              <Link href="#" className="transition-colors hover:text-slate-900">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
