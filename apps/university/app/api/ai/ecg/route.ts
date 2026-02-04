import { NextRequest, NextResponse } from "next/server"
import { generateECGParamsFromPrompt } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const result = await generateECGParamsFromPrompt(prompt)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to generate ECG parameters" }, { status: 500 })
  }
}
