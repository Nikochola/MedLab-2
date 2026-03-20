"use server"

import { revalidatePath } from "next/cache"

import { getServerSession } from "@/server/auth/session"
import {
  activateInstitutionSetupAccount,
  approveInstitutionAccessRequest,
  resendInstitutionSetupLink,
  rejectInstitutionAccessRequest,
  sendInstitutionRequestManualReply,
  sendInstitutionSetupVerificationCode,
  validateInstitutionBillingCode
} from "@/server/institution/access"
import { checkInstitutionWorkspaceSlugAvailability } from "@/server/institution/onboarding"

async function getReviewer() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  return {
    reviewerUserId: session.user.id || null,
    reviewerEmail: session.user.email
  }
}

export async function approveInstitutionAccessRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "")
  const reviewer = await getReviewer()
  const result = await approveInstitutionAccessRequest({
    requestId,
    reviewerUserId: reviewer.reviewerUserId,
    reviewerEmail: reviewer.reviewerEmail
  })

  revalidatePath("/internal/institution-requests")
  return result
}

export async function rejectInstitutionAccessRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "")
  const reason = String(formData.get("reason") || "")
  const reviewer = await getReviewer()

  await rejectInstitutionAccessRequest({
    requestId,
    reviewerUserId: reviewer.reviewerUserId,
    reviewerEmail: reviewer.reviewerEmail,
    reason
  })

  revalidatePath("/internal/institution-requests")
}

export async function resendInstitutionSetupLinkAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "")
  const reviewer = await getReviewer()
  const result = await resendInstitutionSetupLink({
    requestId,
    reviewerEmail: reviewer.reviewerEmail
  })

  revalidatePath("/internal/institution-requests")
  return result
}

export async function sendInstitutionRequestManualReplyAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "")
  const subject = String(formData.get("subject") || "")
  const body = String(formData.get("body") || "")
  const reviewer = await getReviewer()
  const result = await sendInstitutionRequestManualReply({
    requestId,
    reviewerEmail: reviewer.reviewerEmail,
    subject,
    body
  })

  revalidatePath("/internal/institution-requests")
  return result
}

export async function sendInstitutionSetupVerificationCodeAction(token: string) {
  return sendInstitutionSetupVerificationCode(token)
}

export async function activateInstitutionSetupAccountAction(input: {
  token: string
  fullName: string
  password: string
  verificationCode: string
}) {
  return activateInstitutionSetupAccount(input)
}

export async function validateInstitutionBillingCodeAction(code: string, plan: string) {
  return validateInstitutionBillingCode(code, plan)
}

export async function checkInstitutionWorkspaceSlugAvailabilityAction(slug: string, institutionId?: string | null) {
  return checkInstitutionWorkspaceSlugAvailability(slug, institutionId || null)
}
