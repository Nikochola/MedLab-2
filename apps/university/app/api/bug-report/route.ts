import { NextRequest, NextResponse } from "next/server"
type BugReportPayload = {
  message: string
  url?: string
  userAgent?: string
  user?: {
    id?: string
    email?: string
    name?: string
    role?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let body: BugReportPayload = { message: "" }
    let screenshot: File | null = null
    const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      body = {
        message: String(formData.get("message") ?? ""),
        url: formData.get("url") ? String(formData.get("url")) : undefined,
        userAgent: formData.get("userAgent") ? String(formData.get("userAgent")) : undefined,
        user: formData.get("user")
          ? JSON.parse(String(formData.get("user")))
          : undefined,
      }
      const fileValue = formData.get("screenshot")
      screenshot = fileValue instanceof File ? fileValue : null
    } else {
      body = (await request.json()) as BugReportPayload
    }

    const message = body.message?.trim()

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 })
    }

    if (!webhookUrl) {
      return NextResponse.json({ error: "Missing Discord webhook" }, { status: 500 })
    }

    const fields = [
      body.user?.email ? { name: "Email", value: body.user.email, inline: true } : null,
      body.user?.name ? { name: "Name", value: body.user.name, inline: true } : null,
      body.user?.role ? { name: "Role", value: body.user.role, inline: true } : null,
      body.url ? { name: "URL", value: body.url } : null,
      body.userAgent ? { name: "User Agent", value: body.userAgent } : null,
    ].filter(Boolean)

    const attachmentName = screenshot?.name || "screenshot.png"
    const payload: Record<string, unknown> = {
      content: "New MedLab bug report",
      embeds: [
        {
          title: "Bug report",
          description: message,
          color: 0xe11d48,
          fields,
          ...(screenshot ? { image: { url: `attachment://${attachmentName}` } } : {}),
        },
      ],
    }

    let response: Response
    if (screenshot) {
      const formData = new FormData()
      formData.append("payload_json", JSON.stringify(payload))
      const buffer = Buffer.from(await screenshot.arrayBuffer())
      const blob = new Blob([buffer], { type: screenshot.type || "application/octet-stream" })
      formData.append("files[0]", blob, attachmentName)
      response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      })
    } else {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }

    if (!response.ok) {
      const text = await response.text()
      console.error("bug report webhook failed:", text)
      return NextResponse.json({ error: "Failed to send report" }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("bug report error:", error)
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
