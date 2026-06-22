import crypto from "crypto"

import { getStudentAppOrigin } from "@/lib/runtimeUrls"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export type BillingInterval = "monthly" | "yearly"
export type BillingSource = "marketing" | "app"
export type LocalPlan = "free" | "pro"
export type LocalSubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "paused" | "canceled"

type DodoCustomer = {
  customer_id?: string | null
  email?: string | null
  name?: string | null
  metadata?: Record<string, unknown> | null
}

type DodoSubscription = {
  subscription_id: string
  product_id?: string | null
  status?: string | null
  next_billing_date?: string | null
  expires_at?: string | null
  trial_period_days?: number | null
  payment_frequency_interval?: string | null
  customer?: DodoCustomer | null
  metadata?: Record<string, unknown> | null
}

type DodoCheckoutSession = {
  session_id: string
  checkout_url: string | null
}

type DodoCheckoutSessionStatus = {
  id: string
  customer_email?: string | null
  customer_name?: string | null
  payment_id?: string | null
  payment_status?: string | null
}

type DodoCustomerListResponse = {
  items?: Array<DodoCustomer & { created_at?: string | null }>
}

type DodoSubscriptionListResponse = {
  items?: Array<DodoSubscription & { created_at?: string | null }>
}

class DodoApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = "DodoApiError"
    this.status = status
  }
}

function getDodoApiKey() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY
  if (!apiKey) {
    throw new DodoApiError("Missing DODO_PAYMENTS_API_KEY.", 500)
  }
  return apiKey
}

function getDodoBaseUrl() {
  const environment = (process.env.DODO_PAYMENTS_ENVIRONMENT || "test").trim().toLowerCase()
  return environment === "live" || environment === "production"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com"
}

function getWebhookSecret() {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY
  if (!webhookSecret) {
    throw new DodoApiError("Missing DODO_PAYMENTS_WEBHOOK_KEY.", 500)
  }
  return webhookSecret
}

function getProductId(interval: BillingInterval) {
  const value = interval === "monthly"
    ? process.env.DODO_PRODUCT_ID_PRO_MONTHLY
    : process.env.DODO_PRODUCT_ID_PRO_YEARLY

  if (!value) {
    throw new DodoApiError(
      `Missing ${interval === "monthly" ? "DODO_PRODUCT_ID_PRO_MONTHLY" : "DODO_PRODUCT_ID_PRO_YEARLY"}.`,
      500
    )
  }

  return value
}

function buildApiUrl(pathname: string, searchParams?: URLSearchParams) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  const url = new URL(path, getDodoBaseUrl())
  if (searchParams) {
    url.search = searchParams.toString()
  }
  return url.toString()
}

function safeMessageFromBody(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback
  if ("message" in body && typeof body.message === "string") return body.message
  if ("error" in body && typeof body.error === "string") return body.error
  return fallback
}

async function dodoFetch<T>(pathname: string, init?: RequestInit, searchParams?: URLSearchParams): Promise<T> {
  const response = await fetch(buildApiUrl(pathname, searchParams), {
    ...init,
    headers: {
      Authorization: `Bearer ${getDodoApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new DodoApiError(safeMessageFromBody(json, `Dodo API request failed with status ${response.status}.`), response.status)
  }

  return json as T
}

export function sanitizeNextPath(value: string | null | undefined, fallback = "/learn") {
  if (!value) return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

function buildPricingPath(input?: {
  next?: string | null
  interval?: BillingInterval
  source?: BillingSource
  intent?: "checkout"
  status?: string | null
}) {
  const params = new URLSearchParams()
  const next = sanitizeNextPath(input?.next, "/learn")

  if (next !== "/learn") {
    params.set("next", next)
  }
  if (input?.interval) {
    params.set("interval", input.interval)
  }
  if (input?.source) {
    params.set("source", input.source)
  }
  if (input?.intent) {
    params.set("intent", input.intent)
  }
  if (input?.status) {
    params.set("status", input.status)
  }

  const query = params.toString()
  return query ? `/pricing?${query}` : "/pricing"
}

function buildBillingSuccessUrl(input: {
  next?: string | null
  interval: BillingInterval
  source: BillingSource
}) {
  const url = new URL("/pricing/success", getStudentAppOrigin())
  url.searchParams.set("next", sanitizeNextPath(input.next, "/learn"))
  url.searchParams.set("interval", input.interval)
  url.searchParams.set("source", input.source)
  return url.toString()
}

function buildBillingCancelUrl(input: {
  next?: string | null
  interval: BillingInterval
  source: BillingSource
}) {
  const url = new URL(buildPricingPath({
    next: input.next,
    interval: input.interval,
    source: input.source,
    status: "cancelled",
  }), getStudentAppOrigin())
  return url.toString()
}

export function getIntervalFromProductId(productId?: string | null): BillingInterval | null {
  if (!productId) return null
  if (productId === process.env.DODO_PRODUCT_ID_PRO_MONTHLY) return "monthly"
  if (productId === process.env.DODO_PRODUCT_ID_PRO_YEARLY) return "yearly"
  return null
}

function getIntervalFromFrequency(value?: string | null): BillingInterval | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "month") return "monthly"
  if (normalized === "year") return "yearly"
  return null
}

function isLocalProStatus(status: LocalSubscriptionStatus) {
  return status === "active" || status === "trialing"
}

function normalizePaymentStatus(status?: string | null) {
  return status?.trim().toLowerCase() || null
}

function isSuccessfulPaymentStatus(status?: string | null) {
  return normalizePaymentStatus(status) === "succeeded"
}

function isTerminalFailedPaymentStatus(status?: string | null) {
  const normalized = normalizePaymentStatus(status)
  return normalized === "failed" ||
    normalized === "cancelled" ||
    normalized === "requires_payment_method" ||
    normalized === "requires_merchant_action" ||
    normalized === "requires_confirmation"
}

export function mapDodoStatusToLocalStatus(status?: string | null): LocalSubscriptionStatus {
  switch ((status || "").trim().toLowerCase()) {
    case "active":
      return "active"
    case "on_hold":
      return "paused"
    case "cancelled":
      return "canceled"
    case "pending":
    case "failed":
    case "expired":
    default:
      return "inactive"
  }
}

export async function findDodoCustomerByEmail(email: string) {
  const params = new URLSearchParams({ email, page_size: "10", page_number: "0" })
  const response = await dodoFetch<DodoCustomerListResponse>("/customers", undefined, params)
  return response.items?.[0] || null
}

export async function createDodoCheckoutSession(input: {
  userId: string
  email: string
  name: string
  interval: BillingInterval
  next?: string | null
  source: BillingSource
  customerId?: string | null
}) {
  const payload = {
    product_cart: [{ product_id: getProductId(input.interval), quantity: 1 }],
    allowed_payment_method_types: ["credit", "debit"],
    customer: input.customerId
      ? { customer_id: input.customerId }
      : {
        email: input.email,
        name: input.name,
        metadata: {
          user_id: input.userId,
          source: input.source,
        },
      },
    metadata: {
      user_id: input.userId,
      plan: "pro",
      interval: input.interval,
      source: input.source,
      next: sanitizeNextPath(input.next, "/learn"),
    },
    return_url: buildBillingSuccessUrl({
      next: input.next,
      interval: input.interval,
      source: input.source,
    }),
    cancel_url: buildBillingCancelUrl({
      next: input.next,
      interval: input.interval,
      source: input.source,
    }),
    show_saved_payment_methods: Boolean(input.customerId),
  }

  return dodoFetch<DodoCheckoutSession>("/checkouts", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function createDodoCustomerPortalSession(customerId: string) {
  const params = new URLSearchParams({
    send_email: "false",
    return_url: new URL("/pricing", getStudentAppOrigin()).toString(),
  })

  return dodoFetch<{ link: string }>(
    `/customers/${encodeURIComponent(customerId)}/customer-portal/session`,
    { method: "POST" },
    params
  )
}

export async function retrieveDodoSubscription(subscriptionId: string) {
  return dodoFetch<DodoSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`)
}

export async function retrieveDodoCheckoutSession(sessionId: string) {
  return dodoFetch<DodoCheckoutSessionStatus>(`/checkouts/${encodeURIComponent(sessionId)}`)
}

export async function listDodoSubscriptionsForCustomer(customerId: string) {
  const params = new URLSearchParams({
    customer_id: customerId,
    page_size: "20",
    page_number: "0",
  })
  const response = await dodoFetch<DodoSubscriptionListResponse>("/subscriptions", undefined, params)
  return response.items || []
}

async function findLatestProSubscriptionForCustomer(customerId: string) {
  const subscriptions = await listDodoSubscriptionsForCustomer(customerId)
  const matchingProductIds = new Set([
    process.env.DODO_PRODUCT_ID_PRO_MONTHLY,
    process.env.DODO_PRODUCT_ID_PRO_YEARLY,
  ].filter((value): value is string => Boolean(value)))

  return subscriptions
    .filter((subscription) => matchingProductIds.size === 0 || matchingProductIds.has(subscription.product_id || ""))
    .sort((a, b) => {
      const aDate = new Date((a as DodoSubscription & { created_at?: string | null }).created_at || 0).getTime()
      const bDate = new Date((b as DodoSubscription & { created_at?: string | null }).created_at || 0).getTime()
      return bDate - aDate
    })[0] || null
}

async function resolveUserIdForSubscription(subscription: DodoSubscription) {
  const metadataUserId =
    (subscription.metadata?.user_id as string | undefined) ||
    (subscription.customer?.metadata?.user_id as string | undefined)

  if (metadataUserId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", metadataUserId)
      .maybeSingle()

    if (profile?.id) {
      return String(profile.id)
    }
  }

  const email = subscription.customer?.email?.trim().toLowerCase()
  if (!email) return null

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  return profile?.id ? String(profile.id) : null
}

export async function syncSubscriptionFromDodo(subscription: DodoSubscription) {
  const resolvedUserId = await resolveUserIdForSubscription(subscription)
  const interval =
    getIntervalFromProductId(subscription.product_id) ||
    getIntervalFromFrequency(subscription.payment_frequency_interval)

  const payload = {
    user_id: resolvedUserId,
    provider: "dodo",
    plan: "pro" as LocalPlan,
    status: mapDodoStatusToLocalStatus(subscription.status),
    provider_status: subscription.status || null,
    current_period_end: subscription.next_billing_date || subscription.expires_at || null,
    dodo_customer_id: subscription.customer?.customer_id || null,
    dodo_subscription_id: subscription.subscription_id,
    dodo_product_id: subscription.product_id || null,
    billing_interval: interval,
    updated_at: new Date().toISOString(),
  }

  const { data: bySubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id,user_id")
    .eq("dodo_subscription_id", subscription.subscription_id)
    .maybeSingle()

  const existing = bySubscription || (
    resolvedUserId
      ? (await supabaseAdmin
        .from("subscriptions")
        .select("id,user_id")
        .eq("user_id", resolvedUserId)
        .maybeSingle()).data
      : null
  )

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        ...payload,
        user_id: resolvedUserId || existing.user_id || null,
      })
      .eq("id", existing.id)

    if (error) {
      throw new Error(`Failed to update local subscription: ${error.message}`)
    }

    return { userId: resolvedUserId || existing.user_id || null }
  }

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .insert(payload)

  if (error) {
    throw new Error(`Failed to insert local subscription: ${error.message}`)
  }

  return { userId: resolvedUserId }
}

function normalizeSignatureValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("v1,")) return trimmed.slice(3)
  if (trimmed.startsWith("v1=")) return trimmed.slice(3)
  if (/^v\d+$/.test(trimmed)) return null
  return trimmed
}

function collectSignatureCandidates(signatureHeader: string) {
  return signatureHeader
    .split(" ")
    .flatMap((chunk) => chunk.split(","))
    .map(normalizeSignatureValue)
    .filter((value): value is string => Boolean(value))
}

function safeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  if (aBuffer.length !== bBuffer.length) return false
  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

export function verifyDodoWebhookSignature(input: {
  payload: string
  webhookId: string
  webhookTimestamp: string
  webhookSignature: string
}) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const timestamp = Number(input.webhookTimestamp)

  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 60 * 10) {
    throw new DodoApiError("Webhook timestamp is invalid or too old.", 400)
  }

  const signedPayload = `${input.webhookId}.${input.webhookTimestamp}.${input.payload}`
  const digestBase64 = crypto.createHmac("sha256", getWebhookSecret()).update(signedPayload).digest("base64")
  const digestBase64Url = digestBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  const digestHex = crypto.createHmac("sha256", getWebhookSecret()).update(signedPayload).digest("hex")

  const candidates = collectSignatureCandidates(input.webhookSignature)
  const isValid = candidates.some((candidate) =>
    safeEqualString(candidate, digestBase64) ||
    safeEqualString(candidate, digestBase64Url) ||
    safeEqualString(candidate, digestHex)
  )

  if (!isValid) {
    throw new DodoApiError("Invalid webhook signature.", 400)
  }
}

export async function cancelDodoSubscription(subscriptionId: string) {
  return dodoFetch<DodoSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
  )
}

export async function resolveCustomerPortalTarget(input: {
  userId: string
  email: string
}) {
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("dodo_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle()

  if (subscription?.dodo_customer_id) {
    return subscription.dodo_customer_id
  }

  const customer = await findDodoCustomerByEmail(input.email)
  return customer?.customer_id || null
}

async function markFailedCheckoutInactive(input: {
  userId: string
  customerId?: string | null
  subscriptionId?: string | null
  paymentStatus?: string | null
}) {
  const payload = {
    status: "inactive" as LocalSubscriptionStatus,
    provider_status: input.paymentStatus || "failed",
    ...(input.customerId ? { dodo_customer_id: input.customerId } : {}),
    ...(input.subscriptionId ? { dodo_subscription_id: input.subscriptionId } : {}),
    updated_at: new Date().toISOString(),
  }

  if (input.subscriptionId) {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("dodo_subscription_id", input.subscriptionId)
      .select("id")

    if (error) {
      throw new Error(`Failed to revoke failed checkout subscription: ${error.message}`)
    }
    if (data?.length) return
  }

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update(payload)
    .eq("user_id", input.userId)
    .eq("provider", "dodo")

  if (error) {
    throw new Error(`Failed to revoke failed checkout subscription: ${error.message}`)
  }
}

export async function syncCheckoutReturn(input: {
  userId: string
  email: string
  subscriptionId?: string | null
  sessionId?: string | null
}) {
  let paymentStatus: string | null = null
  let checkoutEmail: string | null = null

  if (input.sessionId) {
    const checkout = await retrieveDodoCheckoutSession(input.sessionId)
    paymentStatus = checkout.payment_status || null
    checkoutEmail = checkout.customer_email?.trim().toLowerCase() || null

    if (!isSuccessfulPaymentStatus(paymentStatus)) {
      if (isTerminalFailedPaymentStatus(paymentStatus)) {
        const email = checkoutEmail || input.email.trim().toLowerCase()
        const customer = await findDodoCustomerByEmail(email)
        const latest = customer?.customer_id
          ? await findLatestProSubscriptionForCustomer(customer.customer_id)
          : null

        await markFailedCheckoutInactive({
          userId: input.userId,
          customerId: customer?.customer_id || null,
          subscriptionId: latest?.subscription_id || null,
          paymentStatus,
        })
      }

      return { subscriptionId: null, paymentStatus }
    }
  }

  if (input.subscriptionId) {
    const subscription = await retrieveDodoSubscription(input.subscriptionId)
    const localStatus = mapDodoStatusToLocalStatus(subscription.status)

    await syncSubscriptionFromDodo(subscription)
    return {
      subscriptionId: isLocalProStatus(localStatus) ? subscription.subscription_id : null,
      paymentStatus: paymentStatus || (isLocalProStatus(localStatus) ? "succeeded" : null),
    }
  }

  if (!input.sessionId) {
    throw new DodoApiError("Missing checkout session identifier.", 400)
  }

  const email = checkoutEmail || input.email.trim().toLowerCase()

  const customer = await findDodoCustomerByEmail(email)
  if (!customer?.customer_id) {
    return { subscriptionId: null, paymentStatus }
  }

  const latest = await findLatestProSubscriptionForCustomer(customer.customer_id)
  if (!latest?.subscription_id) {
    return { subscriptionId: null, paymentStatus }
  }

  const subscription = await retrieveDodoSubscription(latest.subscription_id)
  const localStatus = mapDodoStatusToLocalStatus(subscription.status)

  await syncSubscriptionFromDodo(subscription)

  return {
    subscriptionId: isLocalProStatus(localStatus) ? subscription.subscription_id : null,
    paymentStatus,
  }
}
