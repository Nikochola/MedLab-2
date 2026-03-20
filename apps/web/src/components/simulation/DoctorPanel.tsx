"use client"

import { useEffect, useState, useRef } from "react"
import { Lightbulb, Activity, Send, Loader2 } from "lucide-react"
import { ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"
import { InterpretationStep, STEP_QUESTIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const DR_SMITH_AVATAR = "https://api.dicebear.com/9.x/big-smile/svg?seed=dr-smith-ecg&hair=shortHair&eyes=cheery&mouth=teethSmile&skinColor=d5a87a&hairColor=3a1a00&backgroundColor=EEF3FF&scale=90&radius=50&accessoriesProbability=100&accessories=glasses"

interface Message {
  role: "assistant" | "user"
  content: string
  type?: "step" | "feedback" | "chat"
  feedbackType?: "correct" | "incorrect"
  step?: string
}

interface DoctorPanelProps {
  currentStep: InterpretationStep
  onAnswerSubmit: (answer: string) => Promise<{ isCorrect: boolean; message: string; explanation?: string }>
  onStepComplete: () => void
  hints: Record<InterpretationStep, string[]>
  ecgParams: ECGWaveformParams
}

export function DoctorPanel({
  currentStep,
  onAnswerSubmit,
  onStepComplete,
  hints,
  ecgParams,
}: DoctorPanelProps) {
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
            context: JSON.stringify(ecgParams),
            specialty: "ECG Interpretation"
          })
        })
        const data = await response.json()

        setMessages(prev => {
          const alreadyHasStepIntro = prev.some(m => m.type === "step" && m.step === currentStep)
          if (alreadyHasStepIntro) return prev
          return [
            ...prev,
            { role: "assistant", content: data.introduction, type: "step", step: currentStep }
          ]
        })
      } catch (e) {
        setMessages(prev => {
          const alreadyHasStepIntro = prev.some(m => m.type === "step" && m.step === currentStep)
          if (alreadyHasStepIntro) return prev
          return [
            ...prev,
            { role: "assistant", content: STEP_QUESTIONS[currentStep], type: "step", step: currentStep }
          ]
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntro()
  }, [currentStep, ecgParams])

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
          const explanationMsg: Message = { role: "assistant", content: result.explanation, type: "chat" }
          setMessages(prev => [...prev, explanationMsg])
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
            context: JSON.stringify({ type: "ecg", currentStep, params: ecgParams }),
            specialty: "ECG Interpretation",
            isFreeConsult: true
          })
        })

        if (response.ok) {
          const data = await response.json()
          const aiMsg: Message = { role: "assistant", content: data.hint || "I see. Let's look closer.", type: "chat" }
          setMessages(prev => [...prev, aiMsg])
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble thinking right now. Let's focus on the next step.", type: "chat" }])
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Let me try again.", type: "chat" }])
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
    if (msg.role === "user") return { backgroundColor: "#0066FF" }
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
              <img src={DR_SMITH_AVATAR} alt="Dr. Smith" width={40} height={40} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: "#22C55E" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#0E0F12" }}>Dr. Smith</h3>
            <p className="text-[11px] font-medium" style={{ color: "#9B9A94" }}>ECG Interpretation</p>
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
                  Next Objective
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
              <span className="text-xs font-medium" style={{ color: "#9B9A94" }}>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Hints */}
      {isAnsweringStep && (
        <div className="px-5 py-2 shrink-0" style={{ borderTop: "1px solid #E8E6DF" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" style={{ color: "#D97706" }} />
              <p className="text-[11px] font-medium" style={{ color: "#9B9A94" }}>Hints ({revealedHints.length}/3)</p>
            </div>
            <button
              className="text-[11px] font-semibold disabled:opacity-40"
              style={{ color: "#0066FF" }}
              onClick={revealNextHint}
              disabled={revealedHints.length >= 3 || revealedHints.length >= (hints[currentStep]?.length || 0)}
            >
              Need help?
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid #E8E6DF" }}>
        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid #E8E6DF", backgroundColor: "#F5F5F3" }}>
          <input
            className="flex-1 h-11 px-4 text-[13px] bg-transparent outline-none placeholder:text-[#9B9A94]"
            style={{ color: "#0E0F12" }}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAnsweringStep ? "Type your answer..." : "Ask me anything about ECGs..."}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center justify-center h-11 w-11 shrink-0 transition-colors disabled:opacity-30"
            style={{ color: "#0066FF" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] font-medium text-center" style={{ color: "#9B9A94" }}>
          {isAnsweringStep ? "Enter your interpretation to proceed" : "Consultation mode active"}
        </p>
      </div>
    </div>
  )
}
