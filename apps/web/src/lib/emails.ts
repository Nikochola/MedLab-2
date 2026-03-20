import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

interface SendInviteEmailProps {
    email: string;
    fullName?: string;
    institutionName: string;
    inviteLink: string;
}

/**
 * Sends an invitation email to a student via Resend.
 */
export async function sendInviteEmail({
    email,
    fullName,
    institutionName,
    inviteLink,
}: SendInviteEmailProps) {
    try {
        const { data, error } = await resend.emails.send({
            from: "MedLab <onboarding@medlab.edu>", // Replace with verified domain in production
            to: [email],
            subject: `You've been invited to ${institutionName} on MedLab`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 12px;">
          <h2 style="color: #232a39; font-weight: 900; margin-bottom: 16px;">Welcome to MedLab, ${fullName || "Student"}!</h2>
          <p style="color: #445063; line-height: 1.6; margin-bottom: 24px;">
            You have been invited by <strong>${institutionName}</strong> to join their clinical simulation cohort on MedLab.
          </p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
            Accept Invitation & Create Account
          </a>
          <p style="color: #afafaf; font-size: 12px; margin-top: 32px;">
            This link will expire in 7 days. If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteLink}" style="color: #3b82f6;">${inviteLink}</a>
          </p>
        </div>
      `,
        });

        if (error) {
            console.error("Resend error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Failed to send invite email:", error);
        return { success: false, error: "Internal server error" };
    }
}
