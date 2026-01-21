"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { InterpretationStep, STEP_QUESTIONS } from "@/lib/constants"
import { CheckCircle2, XCircle, Lightbulb, User, Sparkles } from "lucide-react"
import { ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"

interface DoctorPanelProps {
  currentStep: InterpretationStep
  onAnswerSubmit: (answer: string) => Promise<{ isCorrect: boolean; message: string; explanation?: string }>
  onStepComplete: () => void
  hints: Record<InterpretationStep, string[]>
  ecgParams: ECGWaveformParams
  onHintReveal?: (step: InterpretationStep, hintIndex: number, hintText: string) => void
}

export function DoctorPanel({
  currentStep,
  onAnswerSubmit,
  onStepComplete,
  hints,
  ecgParams,
  onHintReveal,
}: DoctorPanelProps) {
  const [answer, setAnswer] = useState("")
  const [feedback, setFeedback] = useState<{
    type: "none" | "correct" | "incorrect"
    message: string
    explanation?: string
  }>({ type: "none", message: "" })
  const [revealedHints, setRevealedHints] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [useAI, setUseAI] = useState(true)

  useEffect(() => {
    setRevealedHints([])
  }, [currentStep])

  const revealNextHint = () => {
    const availableHints = hints[currentStep] || []
    if (revealedHints.length >= 3 || revealedHints.length >= availableHints.length) return
    const hintIndex = revealedHints.length
    const nextHint = availableHints[hintIndex]
    setRevealedHints([...revealedHints, nextHint])
    if (onHintReveal && nextHint) {
      onHintReveal(currentStep, hintIndex, nextHint)
    }
  }

  const handleSubmit = async () => {
    if (!answer.trim()) return

    setIsLoading(true)
    try {
      const result = await onAnswerSubmit(answer.trim())
      setIsLoading(false)
      
      if (result.isCorrect) {
        setFeedback({
          type: "correct",
          message: result.message || "Excellent! That's correct. Let's move to the next step.",
          explanation: result.explanation,
        })
        setTimeout(() => {
          setAnswer("")
          setFeedback({ type: "none", message: "" })
          setRevealedHints([])
          onStepComplete()
        }, 3000)
      } else {
        setFeedback({
          type: "incorrect",
          message: result.message || "Not quite. Try again.",
          explanation: result.explanation,
        })
      }
    } catch (error) {
      setIsLoading(false)
      setFeedback({
        type: "incorrect",
        message: "There was an error processing your answer. Please try again.",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit()
    }
  }

  return (
    <div className="portal-surface h-full flex flex-col overflow-hidden">
      {/* Doctor Character Area */}
      <div className="p-6 border-b border-border/60">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
            <User className="h-10 w-10 text-primary" />
          </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Dr. Smith</h3>
                {useAI && (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Your ECG Tutor</p>
            </div>
        </div>
      </div>

      {/* Speech Bubble */}
      <div className="p-6 flex-1">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm leading-relaxed z-10">
                {STEP_QUESTIONS[currentStep]}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Area */}
        {feedback.type !== "none" && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              feedback.type === "correct"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {feedback.type === "correct" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm ${
                  feedback.type === "correct" ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback.message}
              </p>
              {feedback.explanation && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feedback.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hints */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span>Hints ({revealedHints.length}/3)</span>
            </div>
            <Button
              variant="tritary"
              size="sm"
              onClick={revealNextHint}
              disabled={
                revealedHints.length >= 3 ||
                revealedHints.length >= (hints[currentStep]?.length || 0)
              }
            >
              Reveal hint
            </Button>
          </div>
          <div className="space-y-2">
            {revealedHints.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hints revealed yet.</p>
            ) : (
              revealedHints.map((hint, index) => (
                <div key={index} className="text-sm text-muted-foreground border border-border/60 rounded-md p-2 bg-background/70">
                  {hint}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-border/60 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Answer</label>
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here..."
            disabled={isLoading || feedback.type === "correct"}
            className="bg-background"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !answer.trim() || feedback.type === "correct"}
          className="w-full"
        >
          {isLoading ? "Checking..." : "Submit Answer"}
        </Button>
      </div>
    </div>
  )
}
