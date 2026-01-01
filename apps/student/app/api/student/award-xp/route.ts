import { NextResponse } from "next/server"
import { awardXP } from "@/lib/studentTracking"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { studentId, action, data, context } = body

        if (!studentId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Call the shared logic
        const result = await awardXP({
            studentId,
            action,
            data,
            context
        })

        return NextResponse.json(result)

    } catch (error) {
        console.error("Error awarding XP:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
