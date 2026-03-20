"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer";
import { generateToken, hashToken, type MembershipRole, type PrimaryRole } from "@/lib/auth-utils";
import { sendInviteEmail } from "@/lib/emails";
import { provisionPasswordAuthUser, AuthAccountExistsError } from "@/server/auth/provision";
import { detectInstitutionByEmailDomain } from "@/server/institution/onboarding";
import { acceptInvite, getInviteByToken } from "@/server/institution/invites";

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

export async function inviteStudents(
    institutionId: string,
    cohortId: string | null,
    students: Array<{ email: string; fullName: string }>
) {
    const supabase = createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: inst } = await admin.from("institutions").select("name").eq("id", institutionId).single();
    const institutionName = inst?.name || "MedLab";

    const results = [];

    for (const student of students) {
        const rawToken = generateToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error: inviteError } = await admin.from("invites").insert({
            institution_id: institutionId,
            cohort_id: cohortId,
            email: student.email,
            full_name: student.fullName,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            role: "student",
            created_by: user.id,
        });

        if (inviteError) {
            results.push({ email: student.email, status: "failed", error: "DB Error" });
            continue;
        }

        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/student/invite?token=${rawToken}`;
        const emailRes = await sendInviteEmail({
            email: student.email,
            fullName: student.fullName,
            institutionName,
            inviteLink,
        });

        results.push({ email: student.email, status: emailRes.success ? "sent" : "failed" });
    }

    revalidatePath("/institution/students");
    return { success: true, results };
}

export async function validateInviteToken(rawToken: string) {
    const admin = createSupabaseAdminClient();
    const tokenHash = hashToken(rawToken);

    const { data: invite, error } = await admin
        .from("invites")
        .select("*, institutions(name)")
        .eq("token_hash", tokenHash)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (error || !invite) return { error: "Invalid or expired invitation" };

    return { success: true, invite };
}

export async function acceptStudentInvite(rawToken: string, password: string) {
    const { error: valError, invite } = await validateInviteToken(rawToken);
    if (valError || !invite) return { error: valError };

    const admin = createSupabaseAdminClient();
    const fullName = invite.full_name || invite.email.split("@")[0] || "Student";

    try {
        const { userId } = await provisionPasswordAuthUser({
            email: invite.email,
            password,
            name: fullName,
            primaryRole: "institution",
            allowExisting: true
        });

        return await finalizeInvite(admin, userId, invite);
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to activate account." };
    }
}

export async function validateInstitutionInviteToken(rawToken: string) {
    try {
        const invite = await getInviteByToken(rawToken);

        if (!invite) {
            return { error: "Invalid or expired invitation" };
        }

        return {
            success: true,
            invite: {
                ...invite,
                full_name: (invite.metadata as { name?: string } | null)?.name || invite.email.split("@")[0] || "MedLab Member"
            }
        };
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to validate invitation." };
    }
}

export async function acceptInstitutionInvite(rawToken: string, password: string) {
    const result = await validateInstitutionInviteToken(rawToken);

    if ("error" in result && result.error) {
        return { error: result.error };
    }

    const invite = result.invite!;
    const fullName = invite.full_name || invite.email.split("@")[0] || "MedLab Member";

    try {
        const { userId } = await provisionPasswordAuthUser({
            email: invite.email,
            password,
            name: fullName,
            primaryRole: "institution",
            allowExisting: true
        });

        const destination = await acceptInvite({
            token: rawToken,
            userId,
            userEmail: invite.email,
            userName: fullName
        });

        return { success: true, email: invite.email, destination };
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to activate account." };
    }
}

async function finalizeInvite(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, invite: any) {
    // Ensure profile
    await admin.from("profiles").upsert({
        id: userId,
        email: invite.email,
        full_name: invite.full_name,
        primary_role: "institution" as PrimaryRole,
    }, { onConflict: "id" });

    // Join Institution
    await admin.from("institution_memberships").upsert({
        institution_id: invite.institution_id,
        user_id: userId,
        role: "student" as MembershipRole,
    }, { onConflict: "institution_id,user_id" });

    // Mark Invite Accepted
    await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

    return { success: true };
}
