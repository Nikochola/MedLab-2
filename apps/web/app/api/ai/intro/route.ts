import { NextRequest, NextResponse } from "next/server"
import { generateStepIntroduction } from "@/lib/ai/aiClient"
import { authorizeAiRequest } from "@/lib/ai/guard"

export async function POST(request: NextRequest) {
    try {
        const access = await authorizeAiRequest()
        if (!access.ok) return access.response

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

        await access.commitUsage()

        return NextResponse.json({ introduction })
    } catch (error) {
        console.error("API error:", error)
        return NextResponse.json(
            { error: "Failed to generate introduction" },
            { status: 500 }
        )
    }
}
