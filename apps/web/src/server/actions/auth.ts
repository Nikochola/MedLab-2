"use server";

import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { provisionPasswordAuthUser, AuthAccountExistsError } from "@/server/auth/provision";
import { detectInstitutionByEmailDomain } from "@/server/institution/onboarding";
import { getInviteByToken } from "@/server/institution/invites";
import { getInstitutionAppOrigin } from "@/lib/runtimeUrls";

// ─── Student Signup ─────────────────────────────────────────────────────

export async function signUpStudent(formData: FormData) {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();

    if (!email || !password || !name) {
        return { error: "Name, email, and password are required." };
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters." };
    }

    try {
        await provisionPasswordAuthUser({
            email,
            password,
            name,
            primaryRole: "student"
        });
        return { success: true };
    } catch (error) {
        if (error instanceof AuthAccountExistsError) {
            return { error: error.message };
        }

        return { error: error instanceof Error ? error.message : "Failed to create account." };
    }
}

// ─── Institution Signup ─────────────────────────────────────────────────

export async function signUpInstitution(formData: FormData) {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();

    if (!email || !password || !name) {
        return { error: "All fields are required." };
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters." };
    }

    try {
        const existingInstitution = await detectInstitutionByEmailDomain(email);
        if (existingInstitution) {
            return {
                error: `This email domain is already associated with ${existingInstitution.name}. Use institution login instead or ask a current administrator for access.`
            };
        }

        await provisionPasswordAuthUser({
            email,
            password,
            name,
            primaryRole: "institution"
        });
    } catch (err) {
        if (err instanceof AuthAccountExistsError) {
            return { error: err.message };
        }

        console.error("[signUpInstitution] Institution creation error:", err);
        return { error: err instanceof Error ? err.message : "Failed to create account." };
    }

    return { success: true };
}

// ─── Invite Actions ─────────────────────────────────────────────────────

export async function validateInstitutionInviteToken(rawToken: string) {
    try {
        const invite = await getInviteByToken(rawToken);

        if (!invite) {
            return { error: "Invalid or expired invitation" };
        }

        return {
            success: true,
            invite: {
                email: invite.email,
                role: invite.role,
                expires_at: invite.expires_at,
                institution_name: invite.institution_name,
                course_name: invite.course_name,
                full_name: (invite.metadata as { name?: string } | null)?.name || invite.email.split("@")[0] || "MedLab Member"
            }
        };
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to validate invitation." };
    }
}

export async function acceptInstitutionInvite(rawToken: string) {
    const result = await validateInstitutionInviteToken(rawToken);

    if ("error" in result && result.error) {
        return { error: result.error };
    }

    const invite = result.invite!;
    const fullName = invite.full_name || invite.email.split("@")[0] || "MedLab Member";

    try {
        const destination = invite.role === "STUDENT" ? "/learn" : "/institution/overview";
        const callbackUrl = new URL("/auth/callback", getInstitutionAppOrigin());
        callbackUrl.searchParams.set("next", destination);
        const admin = createSupabaseAdminClient();
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email: invite.email,
            options: { redirectTo: callbackUrl.toString() }
        });
        if (linkError || !linkData.user || !linkData.properties?.action_link) {
            throw new Error(linkError?.message || "Could not create secure sign-in link.");
        }

        await admin.auth.admin.updateUserById(linkData.user.id, {
            user_metadata: { ...linkData.user.user_metadata, full_name: fullName, name: fullName }
        });

        const confirmationUrl = new URL("/auth/confirm", getInstitutionAppOrigin());
        confirmationUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
        confirmationUrl.searchParams.set("type", "magiclink");
        confirmationUrl.searchParams.set("invite_token", rawToken);
        return { success: true, confirmationUrl: confirmationUrl.toString() };
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to activate account." };
    }
}
