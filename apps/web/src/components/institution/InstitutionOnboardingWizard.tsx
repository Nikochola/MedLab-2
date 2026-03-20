"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  ImagePlus,
  LockKeyhole,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundPlus
} from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeInstitutionOnboarding } from "@/server/institution/onboarding"
import {
  activateInstitutionSetupAccountAction,
  checkInstitutionWorkspaceSlugAvailabilityAction,
  sendInstitutionSetupVerificationCodeAction,
  validateInstitutionBillingCodeAction
} from "@/server/actions/institutionAccess"

type InstitutionType = "University" | "Medical School" | "Hospital" | "Residency Program" | "Other"
type BillingPlan = "STARTER" | "GROWTH" | "ENTERPRISE"
type BillingInterval = "MONTHLY" | "ANNUAL"
type ContentLibrary = "ECG" | "RADIOLOGY" | "BOTH"
type StudentAccessPolicy = "INVITE_ONLY" | "SSO"
type TeamInviteRole = "EDUCATOR" | "INSTITUTION_ADMIN"
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6

const planCopy: Record<BillingPlan, { monthly: string; annual: string; summary: string }> = {
  STARTER: {
    monthly: "$299/mo",
    annual: "$249/mo billed annually",
    summary: "Up to 100 students, 5 educators, logo branding, ECG library."
  },
  GROWTH: {
    monthly: "$799/mo",
    annual: "$649/mo billed annually",
    summary: "Up to 500 students, unlimited educators, ECG + Radiology, advanced analytics."
  },
  ENTERPRISE: {
    monthly: "Custom",
    annual: "Custom",
    summary: "Unlimited scale, SSO, LMS integrations, custom branding, dedicated support."
  }
}

function slugifyWorkspace(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function dicebearUrl(name: string) {
  const seed = encodeURIComponent(name || "admin")
  return `https://api.dicebear.com/9.x/big-smile/svg?seed=${seed}&hair=shortHair&eyes=cheery&mouth=openedSmile&skinColor=efcc9f&hairColor=220f00&backgroundColor=EEF3FF&scale=90&radius=50&accessoriesProbability=0`
}

// Shared field wrapper
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label style={{ color: "#6B6A65", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </Label>
      {children}
    </div>
  )
}

// Step card header
function StepHeader({ step, icon: Icon, title, color }: { step: number; icon: typeof Building2; title: string; color: string }) {
  return (
    <div className="flex items-center gap-4 pb-6" style={{ borderBottom: "1px solid #F0EEE8" }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: color + "20" }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "#9B9A94" }}>
          Step {step}
        </p>
        <h2 className="text-xl font-bold" style={{ color: "#0E0F12" }}>{title}</h2>
      </div>
    </div>
  )
}

export function InstitutionOnboardingWizard(input: {
  initialAdminName: string
  initialEmail: string
  domainMatch: { name: string; slug: string } | null
  setupLink?: {
    token: string
    requestId: string
    fullName: string
    workEmail: string
    institutionName: string
    institutionType: InstitutionType
    estimatedStudents: number | null
  } | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState<WizardStep>(input.setupLink ? 1 : 2)
  const [accountReady, setAccountReady] = useState(!input.setupLink)
  const stepOrder = useMemo(() => (input.setupLink ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6]) as WizardStep[], [input.setupLink])

  const [accountName, setAccountName] = useState(input.setupLink?.fullName || input.initialAdminName)
  const [accountPassword, setAccountPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isActivatingAccount, setIsActivatingAccount] = useState(false)

  const [institutionName, setInstitutionName] = useState(input.setupLink?.institutionName || "")
  const [institutionType, setInstitutionType] = useState<InstitutionType>(input.setupLink?.institutionType || "Medical School")
  const [countryRegion, setCountryRegion] = useState("")
  const [estimatedStudents, setEstimatedStudents] = useState(
    input.setupLink?.estimatedStudents ? String(input.setupLink.estimatedStudents) : ""
  )
  const [logoUrl, setLogoUrl] = useState("")
  const [logoPreviewName, setLogoPreviewName] = useState("")

  const [adminName, setAdminName] = useState(input.setupLink?.fullName || input.initialAdminName)
  const [jobTitle, setJobTitle] = useState("")
  const [phone, setPhone] = useState("")

  const [billingPlan, setBillingPlan] = useState<BillingPlan>("STARTER")
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTHLY")
  const [billingCode, setBillingCode] = useState("")
  const [billingCodeState, setBillingCodeState] = useState<{
    valid: boolean
    message: string
    waivesCard?: boolean
  } | null>(null)
  const [cardholderName, setCardholderName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")

  const [workspaceSlug, setWorkspaceSlug] = useState("")
  const [workspaceDirty, setWorkspaceDirty] = useState(false)
  const [workspaceStatus, setWorkspaceStatus] = useState<{
    slug: string
    available: boolean
    message: string
  } | null>(null)
  const [isCheckingWorkspace, setIsCheckingWorkspace] = useState(false)
  const [contentLibrary, setContentLibrary] = useState<ContentLibrary>("BOTH")
  const [studentAccessPolicy, setStudentAccessPolicy] = useState<StudentAccessPolicy>("INVITE_ONLY")
  const [teamInvites, setTeamInvites] = useState<Array<{ name: string; email: string; role: TeamInviteRole }>>([
    { name: "", email: "", role: "EDUCATOR" }
  ])

  useEffect(() => {
    if (!workspaceDirty) {
      setWorkspaceSlug(slugifyWorkspace(institutionName))
    }
  }, [institutionName, workspaceDirty])

  useEffect(() => {
    if (currentStep < 5) return

    const timer = window.setTimeout(async () => {
      if (!workspaceSlug.trim()) { setWorkspaceStatus(null); return }
      setIsCheckingWorkspace(true)
      try {
        const result = await checkInstitutionWorkspaceSlugAvailabilityAction(workspaceSlug)
        setWorkspaceStatus(result)
      } catch (error) {
        setWorkspaceStatus({ slug: slugifyWorkspace(workspaceSlug), available: false, message: error instanceof Error ? error.message : "Failed to validate workspace." })
      } finally {
        setIsCheckingWorkspace(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [currentStep, workspaceSlug])

  const workspaceUrlPreview = useMemo(() => {
    const slug = slugifyWorkspace(workspaceSlug)
    return slug ? `${slug}.medlab.io` : "your-workspace.medlab.io"
  }, [workspaceSlug])

  const cardRequired = billingPlan !== "ENTERPRISE" && !billingCodeState?.waivesCard

  function validateStep(step: WizardStep) {
    if (step === 1 && input.setupLink) {
      if (!accountName.trim()) return "Full name is required."
      if (accountPassword.length < 8) return "Password must be at least 8 characters."
      if (!verificationCode.trim()) return "Enter the verification code sent to your work email."
    }
    if (step === 2) {
      if (!institutionName.trim()) return "Institution name is required."
      if (!countryRegion.trim()) return "Country or region is required."
    }
    if (step === 3) {
      if (!adminName.trim()) return "Administrator name is required."
      if (!jobTitle.trim()) return "Job title is required."
    }
    if (step === 4) {
      if (!billingPlan) return "Select a plan to continue."
      if (studentAccessPolicy === "SSO" && billingPlan !== "ENTERPRISE") return "SSO is only available on the Enterprise plan."
      if (cardRequired) {
        if (!cardholderName.trim()) return "Cardholder name is required."
        if (cardNumber.replace(/\D/g, "").length < 12) return "Enter a valid card number."
        if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) return "Use MM/YY for card expiry."
        if (!/^\d{3,4}$/.test(cardCvc.trim())) return "Enter a valid CVC."
      }
    }
    if (step === 5) {
      if (!slugifyWorkspace(workspaceSlug)) return "Workspace name is required."
      if (workspaceStatus && !workspaceStatus.available) return workspaceStatus.message
      if (studentAccessPolicy === "SSO" && billingPlan !== "ENTERPRISE") return "SSO requires the Enterprise plan."
    }
    if (step === 6) {
      const invalidInvite = teamInvites.find(
        (invite) => (invite.name.trim() || invite.email.trim()) && (!invite.name.trim() || !isValidEmail(invite.email))
      )
      if (invalidInvite) return "Each team invite needs a name and valid work email."
    }
    return null
  }

  async function sendVerificationCode() {
    if (!input.setupLink) return
    setIsSendingCode(true)
    try {
      await sendInstitutionSetupVerificationCodeAction(input.setupLink.token)
      setVerificationSent(true)
      toast.success(`Verification code sent to ${input.setupLink.workEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send verification code.")
    } finally {
      setIsSendingCode(false)
    }
  }

  async function completeAccountStep() {
    if (!input.setupLink) return
    const validationError = validateStep(1)
    if (validationError) { toast.error(validationError); return }
    setIsActivatingAccount(true)
    try {
      const result = await activateInstitutionSetupAccountAction({ token: input.setupLink.token, fullName: accountName, password: accountPassword, verificationCode })
      const signInResult = await supabase.auth.signInWithPassword({ email: result.email, password: accountPassword })
      if (signInResult.error) throw new Error(signInResult.error.message)
      setAccountReady(true)
      setAdminName(accountName)
      setCurrentStep(2)
      toast.success("Account verified. Continue with workspace setup.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate administrator account.")
    } finally {
      setIsActivatingAccount(false)
    }
  }

  async function applyBillingCode() {
    if (!billingCode.trim()) { setBillingCodeState(null); return }
    try {
      const result = await validateInstitutionBillingCodeAction(billingCode, billingPlan)
      if (!result) { setBillingCodeState({ valid: false, message: "Code not found or not valid for this plan." }); return }
      setBillingCodeState({ valid: true, message: result.waives_card ? "Code accepted. Card requirement waived." : "Code accepted.", waivesCard: result.waives_card })
    } catch (error) {
      setBillingCodeState({ valid: false, message: error instanceof Error ? error.message : "Failed to validate code." })
    }
  }

  function goNext() {
    const validationError = validateStep(currentStep)
    if (validationError) { toast.error(validationError); return }
    const currentIndex = stepOrder.indexOf(currentStep)
    const nextStep = stepOrder[currentIndex + 1]
    if (nextStep) setCurrentStep(nextStep)
  }

  function goBack() {
    const currentIndex = stepOrder.indexOf(currentStep)
    const prevStep = stepOrder[currentIndex - 1]
    if (prevStep) setCurrentStep(prevStep)
  }

  function updateInvite(index: number, patch: Partial<{ name: string; email: string; role: TeamInviteRole }>) {
    setTeamInvites((current) => current.map((invite, inviteIndex) => (inviteIndex === index ? { ...invite, ...patch } : invite)))
  }

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo files must be 2 MB or smaller."); return }
    const reader = new FileReader()
    reader.onload = () => { setLogoUrl(typeof reader.result === "string" ? reader.result : ""); setLogoPreviewName(file.name) }
    reader.readAsDataURL(file)
  }

  function submit(skipInvites = false) {
    const validationError = validateStep(6)
    if (validationError) { toast.error(validationError); return }
    startTransition(async () => {
      try {
        const result = await completeInstitutionOnboarding({
          institutionName, institutionType, countryRegion,
          estimatedStudents: estimatedStudents ? Number(estimatedStudents) : null,
          logoUrl: logoUrl || null, workspaceSlug, billingPlan, billingInterval,
          billingCode: billingCode || null, billingCardholderName: cardholderName || null,
          billingCardNumber: cardNumber || null, billingCardExpiry: cardExpiry || null,
          billingCardCvc: cardCvc || null, contentLibrary, studentAccessPolicy,
          adminName, adminJobTitle: jobTitle, adminPhone: phone || null,
          accessRequestId: input.setupLink?.requestId || null,
          pendingTeamInvites: skipInvites ? [] : teamInvites.filter((invite) => invite.name.trim() && invite.email.trim()).map((invite) => ({ name: invite.name.trim(), email: invite.email.trim().toLowerCase(), role: invite.role }))
        })
        toast.success("Workspace configured. Redirecting to the administrator portal.")
        router.push(result.redirectTo)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to finish onboarding.")
      }
    })
  }

  const currentStepIndex = stepOrder.indexOf(currentStep) + 1

  const stepDefs = [
    { step: 1, label: "Account Creation", icon: ShieldCheck, hidden: !input.setupLink },
    { step: 2, label: "Institution Setup", icon: Building2 },
    { step: 3, label: "Admin Profile", icon: BriefcaseBusiness },
    { step: 4, label: "Plan & Billing", icon: CreditCard },
    { step: 5, label: "Workspace Config", icon: Sparkles },
    { step: 6, label: "Invite Team", icon: Users },
  ]

  const inputCls = "h-11 w-full rounded-[9px] px-3.5 text-sm outline-none"
  const inputStyle = { border: "1.5px solid #E8E6DF", backgroundColor: "#F8F7F2", color: "#0E0F12" }

  return (
    <div className="min-h-screen px-4 py-10 md:px-8" style={{ backgroundColor: "#F8F7F2" }}>
      {/* Top logo */}
      <div className="mx-auto mb-8 max-w-5xl">
        <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 20 }} />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* Left sidebar */}
          <aside className="space-y-4">
            {/* Account badge */}
            <div className="rounded-[12px] p-5" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                  style={{ backgroundColor: accountReady ? "#EEF3FF" : "#F8F7F2" }}
                >
                  {accountReady
                    ? <ShieldCheck className="h-4 w-4" style={{ color: "#0066FF" }} />
                    : <LockKeyhole className="h-4 w-4" style={{ color: "#9B9A94" }} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.12em", color: accountReady ? "#0066FF" : "#9B9A94" }}>
                    {accountReady ? "Account ready" : "Pending"}
                  </p>
                  <p className="truncate text-sm font-bold" style={{ color: "#0E0F12" }}>
                    {accountReady ? adminName : accountName}
                  </p>
                  <p className="truncate text-xs" style={{ color: "#9B9A94" }}>
                    {input.setupLink?.workEmail || input.initialEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Step progress */}
            <div className="rounded-[12px] p-4" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
              <p className="mb-3 text-[10px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "#9B9A94" }}>
                Step {currentStepIndex} of {stepOrder.length}
              </p>
              <div className="space-y-1.5">
                {stepDefs
                  .filter((item) => !item.hidden)
                  .map((item) => {
                    const isActive = currentStep === item.step
                    const isComplete = currentStep > (item.step as WizardStep)
                    const Icon = item.icon
                    return (
                      <div
                        key={item.step}
                        className="flex items-center gap-3 rounded-[9px] px-3 py-2.5"
                        style={{
                          backgroundColor: isActive ? "#EEF3FF" : isComplete ? "#F0FDF4" : "transparent",
                          border: isActive ? "1.5px solid #C7D9FF" : isComplete ? "1.5px solid #BBF7D0" : "1.5px solid transparent",
                        }}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]"
                          style={{
                            backgroundColor: isActive ? "#0066FF" : isComplete ? "#16A34A" : "#F0EEE8",
                          }}
                        >
                          {isComplete
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            : <Icon className="h-3.5 w-3.5" style={{ color: isActive ? "white" : "#9B9A94" }} />
                          }
                        </div>
                        <p className="text-xs font-semibold" style={{ color: isActive ? "#0047CC" : isComplete ? "#15803D" : "#6B6A65" }}>
                          {item.label}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="space-y-4">

            {/* Step 1: Account Creation */}
            {currentStep === 1 && input.setupLink ? (
              <div className="rounded-[12px] p-7" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
                <StepHeader step={1} icon={ShieldCheck} title="Account Creation" color="#0066FF" />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Full Name">
                    <input className={inputCls} style={inputStyle} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Dr. Jordan Smith"
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                  </Field>
                  <Field label="Work Email">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9B9A94" }} />
                      <input className={inputCls} style={{ ...inputStyle, paddingLeft: 40, backgroundColor: "#F8F7F2", opacity: 0.7 }} disabled value={input.setupLink.workEmail} />
                    </div>
                  </Field>
                  <Field label="Password">
                    <input type="password" className={inputCls} style={inputStyle} value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} placeholder="At least 8 characters"
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                  </Field>
                  <Field label="Verification Code">
                    <input className={inputCls} style={inputStyle} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="6-digit code"
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                  </Field>
                </div>

                {input.domainMatch && (
                  <div className="mt-5 flex gap-3 rounded-[9px] p-4" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#92400E" }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#92400E" }}>Email domain warning</p>
                      <p className="mt-0.5 text-sm" style={{ color: "#B45309" }}>
                        Existing institution on this domain: {input.domainMatch.name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={isSendingCode || isActivatingAccount}
                    className="flex h-10 items-center rounded-[9px] px-5 text-sm font-semibold transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                    style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF", boxShadow: "0 3px 0 #E8E6DF" }}
                  >
                    {isSendingCode ? "Sending..." : verificationSent ? "Resend Code" : "Send Verification Code"}
                  </button>
                  <button
                    type="button"
                    onClick={completeAccountStep}
                    disabled={isActivatingAccount || !verificationSent}
                    className="flex h-10 items-center gap-2 rounded-[9px] px-5 text-sm font-semibold text-white transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                    style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}
                  >
                    {isActivatingAccount ? "Verifying..." : "Verify & Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* Step 2: Institution Setup */}
            {currentStep === 2 ? (
              <div className="rounded-[12px] p-7" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
                <StepHeader step={2} icon={Building2} title="Institution Setup" color="#0066FF" />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Institution Name">
                    <input className={inputCls} style={inputStyle} value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="Harvard Medical School"
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                  </Field>
                  <Field label="Institution Type">
                    <select
                      value={institutionType}
                      onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
                      className="h-11 w-full rounded-[9px] px-3.5 text-sm outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
                    >
                      <option>University</option>
                      <option>Medical School</option>
                      <option>Hospital</option>
                      <option>Residency Program</option>
                      <option>Other</option>
                    </select>
                  </Field>
                  <Field label="Country / Region">
                    <input className={inputCls} style={inputStyle} value={countryRegion} onChange={(e) => setCountryRegion(e.target.value)} placeholder="United States"
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                  </Field>
                  <Field label="Estimated Students">
                    <input className={inputCls} style={inputStyle} value={estimatedStudents} onChange={(e) => setEstimatedStudents(e.target.value.replace(/[^\d]/g, ""))} placeholder="250"
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                  </Field>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-[9px] p-4 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "#F8F7F2", border: "1.5px dashed #E8E6DF" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>Institution Logo</p>
                    <p className="mt-0.5 text-xs" style={{ color: "#9B9A94" }}>Optional. PNG or JPG, max 2 MB.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-semibold" style={{ backgroundColor: "white", color: "#0E0F12", border: "1.5px solid #E8E6DF" }}>
                    <ImagePlus className="h-4 w-4" />
                    {logoPreviewName || "Upload Logo"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
            ) : null}

            {/* Step 3: Admin Profile */}
            {currentStep === 3 ? (
              <div className="rounded-[12px] p-7" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
                <StepHeader step={3} icon={BriefcaseBusiness} title="Admin Profile" color="#6366F1" />

                <div className="mt-6 flex gap-5">
                  {/* DiceBear avatar preview */}
                  <div className="shrink-0">
                    <img
                      src={dicebearUrl(adminName)}
                      alt="Avatar preview"
                      className="rounded-[12px]"
                      style={{ width: 80, height: 80, border: "1.5px solid #E8E6DF" }}
                    />
                    <p className="mt-1.5 text-center text-[10px]" style={{ color: "#9B9A94" }}>Preview</p>
                  </div>

                  <div className="flex-1 grid gap-4 md:grid-cols-2">
                    <Field label="Administrator Name">
                      <input className={inputCls} style={inputStyle} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Dr. Jordan Smith"
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                    </Field>
                    <Field label="Job Title / Role">
                      <input className={inputCls} style={inputStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Program Director"
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Phone (Optional)">
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9B9A94" }} />
                          <input className={inputCls} style={{ ...inputStyle, paddingLeft: 40 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 202 555 0144"
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 4: Plan & Billing */}
            {currentStep === 4 ? (
              <div className="rounded-[12px] p-7" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
                <StepHeader step={4} icon={CreditCard} title="Plan & Billing" color="#F59E0B" />

                {/* Interval toggle */}
                <div className="mt-6 flex gap-1.5 rounded-[9px] p-1" style={{ backgroundColor: "#F8F7F2", border: "1.5px solid #E8E6DF" }}>
                  {(["MONTHLY", "ANNUAL"] as BillingInterval[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBillingInterval(value)}
                      className="flex-1 rounded-[7px] px-4 py-2.5 text-sm font-semibold transition-all"
                      style={{
                        backgroundColor: billingInterval === value ? "white" : "transparent",
                        color: billingInterval === value ? "#0E0F12" : "#9B9A94",
                        boxShadow: billingInterval === value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {value === "MONTHLY" ? "Monthly" : "Annual"}
                    </button>
                  ))}
                </div>

                {/* Plan cards */}
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {(["STARTER", "GROWTH", "ENTERPRISE"] as BillingPlan[]).map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => { setBillingPlan(plan); if (plan !== "ENTERPRISE" && studentAccessPolicy === "SSO") setStudentAccessPolicy("INVITE_ONLY"); setBillingCodeState(null) }}
                      className="rounded-[12px] p-5 text-left transition-all"
                      style={{
                        backgroundColor: billingPlan === plan ? "#EEF3FF" : "#F8F7F2",
                        border: billingPlan === plan ? "1.5px solid #C7D9FF" : "1.5px solid #E8E6DF",
                      }}
                    >
                      <p className="text-sm font-bold" style={{ color: "#0E0F12" }}>
                        {plan === "STARTER" ? "Starter" : plan === "GROWTH" ? "Growth" : "Enterprise"}
                      </p>
                      <p className="mt-1 text-sm font-bold" style={{ color: "#0066FF" }}>
                        {billingInterval === "MONTHLY" ? planCopy[plan].monthly : planCopy[plan].annual}
                      </p>
                      <p className="mt-2 text-xs leading-5" style={{ color: "#6B6A65" }}>{planCopy[plan].summary}</p>
                    </button>
                  ))}
                </div>

                {/* Billing code */}
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Promo / Contract Code">
                    <div className="flex gap-2">
                      <input className={inputCls} style={{ ...inputStyle, flex: 1 }} value={billingCode}
                        onChange={(e) => { setBillingCode(e.target.value); setBillingCodeState(null) }} placeholder="SPRING-2026"
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                      <button type="button" onClick={applyBillingCode} className="flex h-11 items-center rounded-[9px] px-4 text-sm font-semibold" style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF" }}>
                        Apply
                      </button>
                    </div>
                    {billingCodeState && (
                      <p className="mt-1 text-xs font-semibold" style={{ color: billingCodeState.valid ? "#15803D" : "#B91C1C" }}>
                        {billingCodeState.message}
                      </p>
                    )}
                  </Field>
                  <div className="rounded-[9px] p-4 text-xs" style={{ backgroundColor: "#F8F7F2", color: "#6B6A65" }}>
                    <p className="font-semibold" style={{ color: "#0E0F12" }}>Billing rules</p>
                    <p className="mt-1">Starter and Growth require a card unless a promo code waives it. Enterprise proceeds sales-led.</p>
                  </div>
                </div>

                {/* Card fields */}
                {cardRequired && (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Field label="Cardholder Name">
                        <input className={inputCls} style={inputStyle} value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="Jordan Smith"
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Card Number">
                        <input className={inputCls} style={inputStyle} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242"
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                      </Field>
                    </div>
                    <Field label="Expiry">
                      <input className={inputCls} style={inputStyle} value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY"
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                    </Field>
                    <Field label="CVC">
                      <input className={inputCls} style={inputStyle} value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123"
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                    </Field>
                  </div>
                )}
              </div>
            ) : null}

            {/* Step 5: Workspace Config */}
            {currentStep === 5 ? (
              <div className="rounded-[12px] p-7" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
                <StepHeader step={5} icon={Sparkles} title="Workspace Configuration" color="#6366F1" />

                <div className="mt-6 space-y-5">
                  <Field label="Workspace Name / Subdomain">
                    <div className="relative">
                      <Globe2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9B9A94" }} />
                      <input
                        className={inputCls}
                        style={{ ...inputStyle, paddingLeft: 40 }}
                        value={workspaceSlug}
                        onChange={(e) => { setWorkspaceDirty(true); setWorkspaceSlug(e.target.value) }}
                        placeholder="harvard"
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
                      />
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "#9B9A94" }}>URL: {workspaceUrlPreview}</p>
                    {isCheckingWorkspace && <p className="text-xs" style={{ color: "#9B9A94" }}>Checking availability...</p>}
                    {workspaceStatus && <p className="text-xs font-semibold" style={{ color: workspaceStatus.available ? "#15803D" : "#B91C1C" }}>{workspaceStatus.message}</p>}
                  </Field>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: "#9B9A94" }}>Content Library</p>
                    <div className="grid gap-2 md:grid-cols-3">
                      {[{ value: "ECG", title: "ECG Cases" }, { value: "RADIOLOGY", title: "Radiology" }, { value: "BOTH", title: "Both" }].map((library) => (
                        <button
                          key={library.value}
                          type="button"
                          onClick={() => setContentLibrary(library.value as ContentLibrary)}
                          className="rounded-[9px] p-4 text-left"
                          style={{
                            backgroundColor: contentLibrary === library.value ? "#EEF3FF" : "#F8F7F2",
                            border: contentLibrary === library.value ? "1.5px solid #C7D9FF" : "1.5px solid #E8E6DF",
                          }}
                        >
                          <p className="text-sm font-bold" style={{ color: contentLibrary === library.value ? "#0047CC" : "#0E0F12" }}>{library.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: "#9B9A94" }}>Student Access Policy</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {[
                        { value: "INVITE_ONLY", title: "Invite-Only", detail: "Administrators control all access." },
                        { value: "SSO", title: "SSO", detail: "Enterprise only. Identity-provider based." }
                      ].map((policy) => (
                        <button
                          key={policy.value}
                          type="button"
                          onClick={() => setStudentAccessPolicy(policy.value as StudentAccessPolicy)}
                          className="rounded-[9px] p-4 text-left"
                          style={{
                            backgroundColor: studentAccessPolicy === policy.value ? "#EEF3FF" : "#F8F7F2",
                            border: studentAccessPolicy === policy.value ? "1.5px solid #C7D9FF" : "1.5px solid #E8E6DF",
                          }}
                        >
                          <p className="text-sm font-bold" style={{ color: studentAccessPolicy === policy.value ? "#0047CC" : "#0E0F12" }}>{policy.title}</p>
                          <p className="mt-1 text-xs" style={{ color: "#6B6A65" }}>{policy.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 6: Invite Team */}
            {currentStep === 6 ? (
              <div className="rounded-[12px] p-7" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
                <StepHeader step={6} icon={UserRoundPlus} title="Invite Team" color="#16A34A" />
                <p className="mt-3 text-sm" style={{ color: "#6B6A65" }}>
                  Invite educators and co-admins now, or skip and do it later from the portal.
                </p>

                <div className="mt-6 space-y-3">
                  {teamInvites.map((invite, index) => (
                    <div key={index} className="grid gap-3 rounded-[9px] p-4 md:grid-cols-[1fr_1fr_160px_40px]" style={{ backgroundColor: "#F8F7F2", border: "1.5px solid #E8E6DF" }}>
                      <Field label="Name">
                        <input className={inputCls} style={{ ...inputStyle, backgroundColor: "white" }} value={invite.name} onChange={(e) => updateInvite(index, { name: e.target.value })} placeholder="Dr. Avery Carter"
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                      </Field>
                      <Field label="Email">
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9B9A94" }} />
                          <input className={inputCls} style={{ ...inputStyle, backgroundColor: "white", paddingLeft: 40 }} value={invite.email} onChange={(e) => updateInvite(index, { email: e.target.value })} placeholder="educator@hospital.edu"
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
                        </div>
                      </Field>
                      <Field label="Role">
                        <select value={invite.role} onChange={(e) => updateInvite(index, { role: e.target.value as TeamInviteRole })}
                          className="h-11 w-full rounded-[9px] px-3.5 text-sm outline-none"
                          style={{ ...inputStyle, backgroundColor: "white" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")} onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}>
                          <option value="EDUCATOR">Educator</option>
                          <option value="INSTITUTION_ADMIN">Co-Admin</option>
                        </select>
                      </Field>
                      <div className="flex items-end pb-0.5">
                        <button type="button" onClick={() => setTeamInvites((c) => c.filter((_, i) => i !== index))} disabled={teamInvites.length === 1}
                          className="flex h-11 w-10 items-center justify-center rounded-[9px] text-lg font-bold disabled:opacity-30"
                          style={{ backgroundColor: "white", color: "#9B9A94", border: "1.5px solid #E8E6DF" }}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setTeamInvites((c) => [...c, { name: "", email: "", role: "EDUCATOR" }])}
                  className="mt-3 flex h-10 items-center gap-2 rounded-[9px] px-4 text-sm font-semibold"
                  style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF" }}>
                  + Add Another
                </button>
              </div>
            ) : null}

            {/* Navigation */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs" style={{ color: "#9B9A94" }}>
                {currentStep === 6 ? "Final step — you can skip invites and launch now." : "Complete one step at a time."}
              </p>
              <div className="flex gap-2">
                {currentStep > stepOrder[0] && (
                  <button type="button" onClick={goBack} disabled={isPending || isActivatingAccount}
                    className="flex h-10 items-center rounded-[9px] px-5 text-sm font-semibold transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                    style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF", boxShadow: "0 3px 0 #E8E6DF" }}>
                    Back
                  </button>
                )}
                {currentStep === 1 ? null : currentStep < 6 ? (
                  <button type="button" onClick={goNext} disabled={isPending}
                    className="flex h-10 items-center gap-2 rounded-[9px] px-5 text-sm font-semibold text-white transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                    style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => submit(true)} disabled={isPending}
                      className="flex h-10 items-center rounded-[9px] px-5 text-sm font-semibold transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                      style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", border: "1.5px solid #E8E6DF", boxShadow: "0 3px 0 #E8E6DF" }}>
                      Skip Invites
                    </button>
                    <button type="button" onClick={() => submit(false)} disabled={isPending}
                      className="flex h-10 items-center gap-2 rounded-[9px] px-5 text-sm font-semibold text-white transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                      style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}>
                      {isPending ? "Launching..." : "Launch Portal"} <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  )
}
