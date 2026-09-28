export type PracticeCompletionAction = "case_submit" | "ecg_simulation_complete"

export function createPracticeAttemptId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function practiceDurationSeconds(startedAt: number) {
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000))
}

export async function submitPracticeCompletion(input: {
  action: PracticeCompletionAction
  data: Record<string, unknown>
  context?: Record<string, unknown>
}) {
  let lastError = "Practice could not be saved"

  for (let requestNumber = 0; requestNumber < 3; requestNumber += 1) {
    try {
      const response = await fetch("/api/student/award-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      })
      const payload = await response.json().catch(() => ({}))
      if (response.ok) return payload as {
        xpAwarded?: number
        reason?: string
        currentStreak?: number
        newLevel?: number
        attemptRecorded?: boolean
      }
      lastError = typeof payload.error === "string" ? payload.error : lastError
      if (response.status < 500) break
    } catch {
      lastError = "Network connection interrupted"
    }

    if (requestNumber < 2) {
      await new Promise((resolve) => setTimeout(resolve, 300 * (requestNumber + 1)))
    }
  }

  throw new Error(lastError)
}
