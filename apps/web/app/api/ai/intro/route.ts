import { NextRequest, NextResponse } from "next/server"
import { generateStepIntroduction } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { step, context, specialty } = body

        if (!step || !context) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const introduction = await generateStepIntroduction(
            step,
            context,
            specialty
        )

        return NextResponse.json({ introduction })
    } catch (error) {
        console.error("API error:", error)
        return NextResponse.json(
            { error: "Failed to generate introduction" },
            { status: 500 }
        )
    }
}
