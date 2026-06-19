// Single source of truth for free-plan limits.
//
// Semantics: all free quotas reset DAILY (the `increment_usage` /
// `checkUsageLimit` helpers reset the stored count when the day rolls over, and
// the client reads that same count). Keep client and server referencing these
// constants so the paywall behaves identically on both sides.

// Practice sessions a free user gets per day, per modality (ecg_practice / xray_practice).
export const FREE_PRACTICE_DAILY_LIMIT = 3

// AI-assist calls (hint / feedback / validate / intro) a free user gets per day.
export const FREE_AI_DAILY_LIMIT = Number(process.env.FREE_AI_DAILY_LIMIT || 25)
