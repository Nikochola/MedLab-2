"use client"

import { useEffect, useState, useRef } from "react"
import { Lightbulb, Activity, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { handleAiLimit } from "@/lib/ai/aiClientErrors"
import type { XRayPathologyType, XRaySeverity, XRayView } from "@/lib/xray/types"

const DR_RAY_AVATAR = "https://api.dicebear.com/9.x/big-smile/svg?seed=dr-ray-radiology&hair=wavyBob&eyes=normal&mouth=openedSmile&skinColor=efcc9f&hairColor=71635a&backgroundColor=eef3ff&scale=90&radius=50&accessoriesProbability=0"

type XRayInterpretationStep = "view-and-quality" | "primary-pattern" | "localization" | "impression"

const STEP_QUESTIONS: Record<XRayInterpretationStep, string> = {
    "view-and-quality": "Step 1: What projection is this study and is the technical quality acceptable?",
    "primary-pattern": "Step 2: What is the primary radiographic pattern you see?",
    localization: "Step 3: Where is the abnormality distributed?",
    impression: "Step 4: Provide your final training impression.",
}

interface Message {
    role: "assistant" | "user"
    content: string
    type?: "step" | "feedback" | "chat"
    feedbackType?: "correct" | "incorrect"
    step?: string
}

interface XRayDoctorPanelProps {
    currentStep: XRayInterpretationStep
    onAnswerSubmit: (answer: string) => Promise<{ isCorrect: boolean; message: string; explanation?: string }>
    onStepComplete: () => void
    hints: Record<XRayInterpretationStep, string[]>
    view: XRayView
    pathology: XRayPathologyType
    severity: XRaySeverity
}

export function XRayDoctorPanel({
    currentStep,
    onAnswerSubmit,
    onStepComplete,
    hints,
    view,
    pathology,
    severity,
}: XRayDoctorPanelProps) {
    const [inputValue, setInputValue] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [revealedHints, setRevealedHints] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAnsweringStep, setIsAnsweringStep] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    const lastFetchedStep = useRef<string>("")

    useEffect(() => {
        if (lastFetchedStep.current === currentStep) return
        lastFetchedStep.current = currentStep

        setRevealedHints([])
        setInputValue("")
        setIsAnsweringStep(true)

        const fetchIntro = async () => {
            setIsLoading(true)
            try {
                const response = await fetch("/api/ai/intro", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        step: currentStep,
                        context: `Patient study with ${pathology} (${severity} severity) in ${view} projection.`,
                        specialty: "Chest X-Ray Radiology"
                    })
                })
                const data = await response.json()
                setMessages(prev => {
                    const alreadyHasStepIntro = prev.some(m => m.type === "step" && m.step === currentStep)
                    if (alreadyHasStepIntro) return prev
                    return [...prev, { role: "assistant", content: data.introduction, type: "step", step: currentStep }]
                })
            } catch (e) {
                setMessages(prev => {
                    const alreadyHasStepIntro = prev.some(m => m.type === "step" && m.step === currentStep)
                    if (alreadyHasStepIntro) return prev
                    return [...prev, { role: "assistant", content: STEP_QUESTIONS[currentStep], type: "step", step: currentStep }]
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchIntro()
    }, [currentStep, pathology, severity, view])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const revealNextHint = () => {
        const availableHints = hints[currentStep] || []
        if (revealedHints.length >= 3 || revealedHints.length >= availableHints.length) return
        const nextHint = availableHints[revealedHints.length]
        setRevealedHints(prev => [...prev, nextHint])
        const hintMsg: Message = { role: "assistant", content: `Hint: ${nextHint}`, type: "chat" }
        setMessages(prev => [...prev, hintMsg])
    }

    const handleSubmit = async () => {
        if (!inputValue.trim()) return
        const userMsg = inputValue.trim()
        setInputValue("")
        setMessages(prev => [...prev, { role: "user", content: userMsg }])
        setIsLoading(true)

        const isGreeting = (text: string) => {
            const greetings = ["hi", "hello", "hey", "yo", "sup", "howdy"]
            return greetings.includes(text.toLowerCase().trim())
        }

        try {
            if (isAnsweringStep && !userMsg.endsWith("?") && !isGreeting(userMsg)) {
                const result = await onAnswerSubmit(userMsg)
                const feedbackMsg: Message = {
                    role: "assistant",
                    content: result.message || (result.isCorrect ? "Correct." : "Incorrect."),
                    type: "feedback",
                    feedbackType: result.isCorrect ? "correct" : "incorrect"
                }
                setMessages(prev => [...prev, feedbackMsg])

                if (result.explanation) {
                    setMessages(prev => [...prev, { role: "assistant", content: result.explanation!, type: "chat" }])
                }

                if (result.isCorrect) {
                    setIsAnsweringStep(false)
                    setTimeout(() => { onStepComplete() }, 3500)
                }
            } else {
                const response = await fetch("/api/ai/hint", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question: userMsg,
                        context: JSON.stringify({ type: "xray", currentStep, view, pathology, severity }),
                        specialty: "Chest X-Ray Radiology",
                        isFreeConsult: true
                    })
                })

                if (handleAiLimit(response)) return

                if (response.ok) {
                    const data = await response.json()
                    setMessages(prev => [...prev, { role: "assistant", content: data.hint || "Understood. Let's analyze the findings.", type: "chat" }])
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble analyzing this plate right now. Let's finish the report.", type: "chat" }])
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "System error during analysis. Try again.", type: "chat" }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && !isLoading) {
            void handleSubmit()
        }
    }

    function bubbleStyle(msg: Message): React.CSSProperties {
        if (msg.role === "user") return { backgroundColor: "#0E0F12" }
        if (msg.type === "feedback" && msg.feedbackType === "correct") return { backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }
        if (msg.type === "feedback" && msg.feedbackType === "incorrect") return { backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }
        if (msg.type === "step") return { backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }
        return { backgroundColor: "#F5F5F3", border: "1px solid #E8E6DF" }
    }

    return (
        <div className="flex h-[calc(100vh-56px)] flex-col bg-white">
            {/* Header */}
            <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid #E8E6DF" }}>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl" style={{ border: "1px solid #E8E6DF" }}>
                            <img src={DR_RAY_AVATAR} alt="Dr. Ray" width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: "#22C55E" }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: "#0E0F12" }}>Dr. Ray</h3>
                        <p className="text-[11px] font-medium" style={{ color: "#9B9A94" }}>Radiology Interpretation</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4 scroll-smooth">
                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div
                            className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                                msg.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm"
                            )}
                            style={{ ...bubbleStyle(msg), color: msg.role === "user" ? "#fff" : "#0E0F12" }}
                        >
                            {msg.type === "step" && (
                                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#0066FF" }}>
                                    <Activity className="h-3 w-3" />
                                    Radiology Step
                                </div>
                            )}
                            {msg.type === "feedback" && msg.feedbackType === "correct" && (
                                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#16A34A" }}>Correct</div>
                            )}
                            {msg.type === "feedback" && msg.feedbackType === "incorrect" && (
                                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#DC2626" }}>Try Again</div>
                            )}
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: "#F5F5F3", border: "1px solid #E8E6DF" }}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#0066FF" }} />
                            <span className="text-xs font-medium" style={{ color: "#9B9A94" }}>Analyzing...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Hints */}
            {isAnsweringStep && (
                <div className="flex items-center gap-1.5 px-5 pb-2 shrink-0">
                    <span className="text-[11px] shrink-0" style={{ color: "#9B9A94" }}>Hints:</span>
                    {[0, 1, 2].map((i) => {
                        const available = (hints[currentStep]?.length || 0)
                        const used = revealedHints.length
                        return (
                            <button
                                key={i}
                                onClick={revealNextHint}
                                disabled={i >= available || i < used}
                                className={cn(
                                    "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                                    i < used
                                        ? "bg-[#EEF3FF] text-[#0066FF]"
                                        : i >= available
                                            ? "bg-[#F5F5F3] text-[#9B9A94] opacity-40"
                                            : "bg-[#F5F5F3] text-[#6B6A65] hover:bg-[#EEEDEA]"
                                )}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                Hint {i + 1}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderTop: "1px solid #F5F5F3" }}>
                <div className="flex flex-1 items-center rounded-xl" style={{ border: "1px solid #E8E6DF", backgroundColor: "#F5F5F3" }}>
                    <input
                        className="flex-1 h-[42px] px-3.5 text-[13px] bg-transparent outline-none placeholder:text-[#9B9A94]"
                        style={{ color: "#0E0F12" }}
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isAnsweringStep ? "Describe what you see..." : "Ask me anything about this X-ray..."}
                        disabled={isLoading}
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !inputValue.trim()}
                    className="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl transition-colors disabled:opacity-30"
                    style={{ backgroundColor: "#0066FF" }}
                >
                    <Send className="h-4 w-4 text-white" />
                </button>
            </div>
        </div>
    )
}
