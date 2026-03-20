"use client"

import { useState } from "react"
import { Loader2, Sparkles, ClipboardCheck } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
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

        // Simulate submission
        toast.success("X-Ray Assessment Submitted!", {
            description: "Your report has been saved to your training record.",
        })

        // Award XP
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
        <div className="h-full overflow-y-auto p-6 scrollbar-hide">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card variant="conceptShell">
                    <div className="flex items-center gap-3">
                        <ClipboardCheck className="h-6 w-6 text-emerald-500" />
                        <div>
                            <h2 className="font-display text-xl font-black text-[#232a39]">Radiology Report</h2>
                            <p className="text-xs font-semibold text-[#6f7c8f]">Structured clinical assessment</p>
                        </div>
                    </div>
                </Card>

                {/* Technical Quality */}
                <Card variant="conceptWidget">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-[#777]">1. Technical Assessment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Projection</Label>
                            <RadioGroup
                                value={formData.projection}
                                onValueChange={(v) => setFormData({ ...formData, projection: v as any })}
                                className="flex gap-4"
                            >
                                {["PA", "AP", "Lateral"].map(p => (
                                    <div key={p} className="flex items-center gap-2">
                                        <RadioGroupItem value={p} id={`p-${p}`} />
                                        <Label htmlFor={`p-${p}`} className="text-sm">{p}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Inspiration / Quality</Label>
                            <RadioGroup
                                value={formData.quality}
                                onValueChange={(v) => setFormData({ ...formData, quality: v as any })}
                                className="grid grid-cols-2 gap-2"
                            >
                                {["Adequate", "Rotated", "Poor Inspiration"].map(q => (
                                    <div key={q} className="flex items-center gap-2">
                                        <RadioGroupItem value={q} id={`q-${q}`} />
                                        <Label htmlFor={`q-${q}`} className="text-sm">{q}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>

                {/* Findings */}
                <Card variant="conceptWidget">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-[#777]">2. Radiographic Findings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Primary Pattern</Label>
                            <Input
                                variant="concept"
                                placeholder="e.g. Consolidation, Meniscus..."
                                value={formData.pattern}
                                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Localization</Label>
                            <Input
                                variant="concept"
                                placeholder="e.g. Right Lower Lobe..."
                                value={formData.localization}
                                onChange={(e) => setFormData({ ...formData, localization: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Detailed Description</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-xl border-2 border-[#e5e5e5] bg-[#f7f9fc] p-3 text-sm font-semibold outline-none focus:bg-white"
                                placeholder="Describe margins, density, and associated features..."
                                value={formData.findings}
                                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Impression */}
                <Card variant="conceptWidget">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-[#777]">3. Training Impression</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            variant="concept"
                            placeholder="Final diagnostic impression..."
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                        />
                    </CardContent>
                </Card>

                <div className="pt-2 space-y-3">
                    <Button type="submit" variant="default" size="lg" className="w-full">
                        Submit Assessment
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="lg" className="w-full"
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
                            <Sparkles className="h-5 w-5 text-emerald-500" />
                            Radiology Tutor Feedback
                        </DialogTitle>
                        <DialogDescription>
                            AI-driven analysis of your radiographic interpretation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1 text-sm font-semibold text-[#4a586d]">
                        {isLoadingFeedback ? (
                            <div className="flex flex-col items-center py-12 gap-3 text-[#afafaf]">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                <p className="uppercase tracking-widest text-[10px] font-black">Analyzing Report Quality...</p>
                            </div>
                        ) : aiFeedback ? (
                            <div className="space-y-4">
                                <div className="rounded-xl bg-emerald-50 p-4 border-2 border-emerald-100 text-emerald-800">
                                    <p>{aiFeedback.summary || "Good structural analysis of the film."}</p>
                                </div>
                                {aiFeedback.corrections?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase font-black text-red-400 pl-1">Clinical Adjustments</p>
                                        {aiFeedback.corrections.map((c: string, i: number) => (
                                            <div key={i} className="rounded-xl bg-red-50 p-3 border border-red-100 text-red-700">{c}</div>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-black text-blue-400 pl-1">Key Findings</p>
                                    {aiFeedback.strengths?.map((s: string, i: number) => (
                                        <div key={i} className="rounded-xl bg-blue-50 p-3 border border-blue-100 text-blue-700">{s}</div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-center py-8 opacity-50">No analysis available.</p>
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
