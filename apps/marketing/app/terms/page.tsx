import { SharedNavbar } from "@/components/sections/SharedNavbar"
import { SharedFooter } from "@/components/sections/SharedFooter"
import { FadeUp } from "@/components/motion/FadeUp"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 40, paddingBottom: 40, borderBottom: "1px solid #E8E6DF" }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, color: "#0E0F12", letterSpacing: "-0.02em", margin: "0 0 16px" }}>{title}</h2>
      <div style={{ fontSize: 15, color: "#6B6A65", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0 }}>{children}</p>
}

function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar />

      <FadeUp>
      <div className="px-5 md:px-[80px]" style={{ paddingTop: 72, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          <div style={{ paddingBottom: 40, borderBottom: "1px solid #E8E6DF" }}>
            <h1 style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 16px" }}>Terms of Service</h1>
            <p style={{ fontSize: 14, color: "#9B9A94", margin: 0 }}>Last updated: March 17, 2026</p>
          </div>

          <Section title="Acceptance of Terms">
            <P>By creating an account or using the MedLab platform ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</P>
            <P>These terms apply to all users: individual students, educators, and institutional administrators. If you are using MedLab on behalf of an institution, you represent that you have the authority to bind that institution to these terms.</P>
          </Section>

          <Section title="The Service">
            <P>MedLab is a medical education platform that provides AI-assisted clinical case simulations, ECG and radiology interpretation practice, and educator analytics tools. The Service is intended for educational purposes only.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>MedLab is not a clinical decision support tool.</strong> Nothing on the platform constitutes medical advice, diagnosis, or treatment. The AI-generated feedback, case scenarios, and clinical content are designed for learning purposes and must not be used to guide real patient care. Always defer to licensed clinical supervision and established institutional protocols.</P>
          </Section>

          <Section title="Accounts">
            <P>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account.</P>
            <P>You must be at least 16 years old to create an account. Institutional accounts for minors require explicit consent from the institution and a signed agreement with MedLab.</P>
            <P>We reserve the right to suspend or terminate accounts that violate these terms, misuse the platform, or engage in behaviour that harms other users or the integrity of the Service.</P>
          </Section>

          <Section title="Acceptable Use">
            <P>You agree not to:</P>
            <UL items={[
              "Use the Service for any purpose other than educational practice and learning",
              "Attempt to circumvent access controls, gating, or subscription limits",
              "Share account credentials with others or resell access to the platform",
              "Scrape, copy, or reproduce case content, question banks, or AI outputs in bulk",
              "Upload or transmit real patient data, protected health information (PHI), or any personally identifiable clinical information",
              "Use the Service to train competing AI models or build derivative products",
              "Harass, impersonate, or harm other users",
              "Attempt to reverse-engineer, decompile, or extract the underlying AI models",
            ]} />
          </Section>

          <Section title="Subscriptions and Billing">
            <P>MedLab offers a free tier and paid Pro subscriptions, billed monthly or annually. Institutional plans are governed by a separate agreement.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Cancellations.</strong> You may cancel your Pro subscription at any time. Access continues until the end of the current billing period. We do not offer prorated refunds for mid-period cancellations.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Refunds.</strong> We offer a 7-day refund window for first-time Pro subscribers who have not consumed more than 10 cases. Refund requests must be submitted to support@getmedlab.com within 7 days of the charge.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Price changes.</strong> We will give at least 30 days' notice before increasing subscription prices. Changes take effect at your next renewal.</P>
          </Section>

          <Section title="Intellectual Property">
            <P>All content on the MedLab platform — including case scenarios, ECG simulations, radiology cases, AI feedback templates, and educational materials — is owned by MedLab or its licensors. You may not reproduce, distribute, or create derivative works from this content without written permission.</P>
            <P>You retain ownership of any content you submit (e.g. written answers, free-text reasoning). By submitting content, you grant MedLab a non-exclusive, royalty-free licence to use that content to operate the Service, improve platform quality, and generate aggregate insights. We will not identify you personally in any such use.</P>
          </Section>

          <Section title="Institutional Terms">
            <P>Institutions accessing MedLab under a site licence or cohort agreement are subject to an additional Master Services Agreement (MSA). In the event of a conflict between these Terms and the MSA, the MSA governs.</P>
            <P>Institutions are responsible for ensuring their users comply with these Terms. Institutions must not configure the platform in a way that exposes student data to unauthorised parties or violates applicable education privacy law (including FERPA, GDPR Article 9, and equivalent regulations).</P>
          </Section>

          <Section title="Disclaimers and Limitation of Liability">
            <P>The Service is provided "as is" without warranty of any kind. We do not guarantee uninterrupted availability, error-free content, or specific educational outcomes.</P>
            <P>To the maximum extent permitted by law, MedLab's total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</P>
            <P>MedLab is not liable for any indirect, incidental, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to harm arising from reliance on AI-generated clinical content.</P>
          </Section>

          <Section title="Termination">
            <P>Either party may terminate this agreement at any time. You may delete your account through the platform settings. We may suspend or terminate your access immediately if we believe you are in material breach of these Terms.</P>
            <P>Upon termination, your licence to use the Service ends. Provisions that should survive termination (intellectual property, limitation of liability, dispute resolution) will do so.</P>
          </Section>

          <Section title="Governing Law">
            <P>These Terms are governed by the laws of Georgia (country). Any disputes arising from these Terms or your use of the Service will be resolved through binding arbitration, except where prohibited by applicable law. You waive any right to participate in class-action proceedings.</P>
          </Section>

          <Section title="Changes to These Terms">
            <P>We may update these Terms as the platform evolves. For material changes, we will notify active users by email at least 14 days before they take effect. Continued use after that date constitutes acceptance of the revised Terms.</P>
          </Section>

          <Section title="Contact">
            <P>For questions about these Terms, email <a href="mailto:legal@getmedlab.com" style={{ color: "#0066FF", textDecoration: "none" }}>legal@getmedlab.com</a>.</P>
          </Section>

        </div>
      </div>
      </FadeUp>

      <SharedFooter />
    </div>
  )
}
