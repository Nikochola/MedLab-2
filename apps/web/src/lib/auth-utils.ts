import { createHash, randomBytes } from "crypto";

/**
 * Generates a random secure token.
 */
export function generateToken(): string {
    return randomBytes(32).toString("hex");
}

/**
 * Hashes a token using SHA-256 for secure storage.
 */
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Validates a role for institution memberships.
 */
export type MembershipRole = "admin" | "teacher" | "student";

/**
 * Validates a primary role for profiles.
 */
export type PrimaryRole = "student" | "institution";
