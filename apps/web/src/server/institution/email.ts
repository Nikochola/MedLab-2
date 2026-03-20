import { render } from "@react-email/render"
import { Resend } from "resend"

import { buildInstitutionUrl } from "@/lib/runtimeUrls"
import InviteEmail from "@/emails/InviteEmail"

const resendApiKey = process.env.RESEND_API_KEY
const inviteFrom = process.env.INVITE_FROM_EMAIL || process.env.NEXT_PUBLIC_INVITE_FROM_EMAIL || "access@getmedlab.com"
const replyToEmail = process.env.INSTITUTION_REPLY_TO_EMAIL || "access@getmedlab.com"

const resend = resendApiKey ? new Resend(resendApiKey) : null

function roleLabel(role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT") {
  if (role === "INSTITUTION_ADMIN") {
    return "Institution Admin"
  }

  if (role === "EDUCATOR") {
    return "Educator"
  }

  return "Student"
}

export async function sendInviteEmail(input: {
  email: string
  token: string
  role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT"
  institutionName: string
  courseName?: string | null
}) {
  const inviteUrl = buildInstitutionUrl(`/invite/${input.token}`)

  if (!resend || !inviteFrom) {
    return {
      sent: false,
      error: "Resend is not configured",
      inviteUrl
    }
  }

  const subject =
    input.role === "INSTITUTION_ADMIN"
      ? `You are invited to administer ${input.institutionName}`
      : input.role === "EDUCATOR"
        ? `You are invited to teach in ${input.institutionName}`
        : `You are invited to join ${input.institutionName}`

  const html = render(
    InviteEmail({
      institutionName: input.institutionName,
      courseName: input.courseName || null,
      roleLabel: roleLabel(input.role),
      inviteUrl
    })
  )

  try {
    await resend.emails.send({
      from: inviteFrom,
      to: input.email,
      replyTo: replyToEmail,
      subject,
      html
    })

    return {
      sent: true,
      error: null,
      inviteUrl
    }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email send failed",
      inviteUrl
    }
  }
}
