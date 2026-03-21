"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface XRayAssessmentData {
    projection: "PA" | "AP" | "Lateral" | ""
    quality: "Adequate" | "Rotated" | "Poor Inspiration" | ""
    pattern: string
    localization: string
    findings: string
    diagnosis: string
}

interface XRayAssessmentFormProps {
    patientCase?: any
    xrayFindings?: any
}

const inputClass = "w-full rounded-lg border border-[#E8E6DF] bg-white px-2.5 py-2 text-[13px] outline-none placeholder:text-[#9B9A94] focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20"
const sectionClass = "rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5 space-y-3"
const sectionLabel = "text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9B9A94]"

function TogglePill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-lg px-3.5 py-[7px] text-[13px] font-medium transition-colors",
                selected
                    ? "bg-[#0066FF] text-white"
                    : "border border-[#E8E6DF] bg-[#F5F5F3] text-[#6B6A65] hover:bg-[#EEEDEA]"
            )}
        >
            {label}
        </button>
    )
}

export function XRayAssessmentForm({ patientCase, xrayFindings }: XRayAssessmentFormProps) {
    const [formData, setFormData] = useState<XRayAssessmentData>({
        projection: "",
        quality: "",
        pattern: "",
        localization: "",
        findings: "",
        diagnosis: "",
    })

    const [aiFeedback, setAiFeedback] = useState<any>(null)
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const { user } = useAuth()

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!user) {
            toast.error("Please sign in to submit.")
            return
        }

        toast.success("X-Ray Assessment Submitted!", {
            description: "Your report has been saved to your training record.",
        })

        void fetch("/api/student/award-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentId: user.id,
                action: "case_submit",
                data: { caseType: "xray" }
            })
        }).then(() => mutate(`/api/student/stats?studentId=${user.id}`))
    }

    const handleGetAIFeedback = async () => {
        setIsLoadingFeedback(true)
        setShowFeedback(true)

        try {
            const response = await fetch("/api/ai/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentAssessment: JSON.stringify(formData),
                    patientCase: JSON.stringify(patientCase),
                    findings: JSON.stringify(xrayFindings),
                    role: "expert radiologist"
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setAiFeedback(data.feedback)
            } else {
                toast.error("Unable to generate feedback.")
            }
        } catch (error) {
            console.error("AI feedback error:", error)
        } finally {
            setIsLoadingFeedback(false)
        }
    }

    return (
        <div className="flex h-full flex-col bg-white">
            {/* Header */}
            <div className="shrink-0 px-5 py-4" style={{ borderBottom: "1px solid #E8E6DF" }}>
                <h2 className="text-sm font-semibold" style={{ color: "#0E0F12" }}>Radiology Report</h2>
                <p className="text-[11px] font-medium" style={{ color: "#9B9A94" }}>Structured assessment</p>
            </div>

            {/* Form content */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 scrollbar-hide">
                    {/* 1. Technical Assessment */}
                    <div className={sectionClass}>
                        <p className={sectionLabel}>1. Technical Assessment</p>

                        <div className="space-y-1.5">
                            <p className="text-[12px] font-medium text-[#6B6A65]">Projection</p>
                            <div className="flex gap-1.5">
                                {(["PA", "AP", "Lateral"] as const).map(p => (
                                    <TogglePill
                                        key={p}
                                        label={p}
                                        selected={formData.projection === p}
                                        onClick={() => setFormData({ ...formData, projection: p })}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[12px] font-medium text-[#6B6A65]">Inspiration / Quality</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(["Adequate", "Rotated", "Poor Inspiration"] as const).map(q => (
                                    <TogglePill
                                        key={q}
                                        label={q}
                                        selected={formData.quality === q}
                                        onClick={() => setFormData({ ...formData, quality: q })}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 2. Radiographic Findings */}
                    <div className={sectionClass}>
                        <p className={sectionLabel}>2. Radiographic Findings</p>

                        <div className="space-y-1.5">
                            <p className="text-[12px] font-medium text-[#6B6A65]">Primary Pattern</p>
                            <input
                                className={inputClass}
                                placeholder="e.g. Consolidation, Meniscus..."
                                value={formData.pattern}
                                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[12px] font-medium text-[#6B6A65]">Localization</p>
                            <input
                                className={inputClass}
                                placeholder="e.g. Right Lower Lobe..."
                                value={formData.localization}
                                onChange={(e) => setFormData({ ...formData, localization: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[12px] font-medium text-[#6B6A65]">Detailed Description</p>
                            <textarea
                                className={cn(inputClass, "min-h-[72px] resize-none")}
                                placeholder="Describe margins, density, and associated features..."
                                value={formData.findings}
                                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 3. Training Impression */}
                    <div className={sectionClass}>
                        <p className={sectionLabel}>3. Training Impression</p>
                        <div className="space-y-1.5">
                            <p className="text-[12px] font-medium text-[#6B6A65]">Final Diagnosis</p>
                            <input
                                className={inputClass}
                                placeholder="Final diagnostic impression..."
                                value={formData.diagnosis}
                                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="shrink-0 space-y-2 px-5 py-3" style={{ borderTop: "1px solid #E8E6DF" }}>
                    <Button type="submit" variant="default" size="lg" className="w-full">
                        Submit Assessment
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={handleGetAIFeedback}
                        disabled={isLoadingFeedback || !formData.diagnosis.trim()}
                    >
                        {isLoadingFeedback ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        AI Case Review
                    </Button>
                </div>
            </form>

            <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" style={{ color: "#0066FF" }} />
                            Radiology Tutor Feedback
                        </DialogTitle>
                        <DialogDescription>
                            AI-driven analysis of your radiographic interpretation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-[13px] text-[#6B6A65]">
                        {isLoadingFeedback ? (
                            <div className="flex flex-col items-center gap-3 py-12 text-[#9B9A94]">
                                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0066FF" }} />
                                <p className="text-[10px] font-semibold uppercase tracking-widest">Analyzing Report Quality...</p>
                            </div>
                        ) : aiFeedback ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-[#15803D]">
                                    <p>{aiFeedback.summary || "Good structural analysis of the film."}</p>
                                </div>
                                {aiFeedback.corrections?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="pl-1 text-[10px] font-semibold uppercase tracking-wider text-[#DC2626]">Clinical Adjustments</p>
                                        {aiFeedback.corrections.map((c: string, i: number) => (
                                            <div key={i} className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[#B91C1C]">{c}</div>
                                        ))}
                                    </div>
                                )}
                                {aiFeedback.strengths?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="pl-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#0066FF" }}>Key Findings</p>
                                        {aiFeedback.strengths.map((s: string, i: number) => (
                                            <div key={i} className="rounded-xl border border-[#C7D9FF] bg-[#EEF3FF] p-3" style={{ color: "#0047CC" }}>{s}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="py-8 text-center opacity-50">No analysis available.</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFeedback(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
