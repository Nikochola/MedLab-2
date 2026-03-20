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

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar />

      <FadeUp>
      <div className="px-5 md:px-[80px]" style={{ paddingTop: 72, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          <div style={{ paddingBottom: 40, borderBottom: "1px solid #E8E6DF" }}>
            <h1 style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 16px" }}>Privacy Policy</h1>
            <p style={{ fontSize: 14, color: "#9B9A94", margin: 0 }}>Last updated: March 17, 2026</p>
          </div>

          <Section title="Overview">
            <P>MedLab ("we", "us", or "our") operates the MedLab platform — a medical education tool for students and institutions. This Privacy Policy explains what data we collect, how we use it, and the choices you have. By using MedLab, you agree to the practices described here.</P>
            <P>We do not sell your personal data. We do not use your data to train AI models without explicit consent. Medical education data is handled with the same care we would expect from any platform we would trust with our own learning.</P>
          </Section>

          <Section title="Information We Collect">
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Account information.</strong> When you sign up, we collect your email address, name, and a password hash. Institutional accounts may include your university affiliation.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Usage data.</strong> We record your interactions with cases — answers submitted, time spent, hints requested, and performance scores. This data powers your progress dashboard and the analytics visible to your institution if applicable.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Device and log data.</strong> Standard server logs: IP address, browser type, device type, pages visited, and timestamps. Used for security, debugging, and aggregate analytics.</P>
            <P><strong style={{ color: "#0E0F12", fontWeight: 600 }}>Payment information.</strong> We use Paddle as our payment processor. We never see or store your full card details — Paddle handles all payment data under their own PCI-DSS compliance.</P>
          </Section>

          <Section title="How We Use Your Information">
            <UL items={[
              "Operate and improve the MedLab platform",
              "Personalise your learning experience and track progress",
              "Provide educators and institutions with cohort-level analytics",
              "Send transactional emails (receipts, password resets, case completions)",
              "Respond to support requests",
              "Detect fraud, abuse, and security incidents",
              "Comply with legal obligations",
            ]} />
            <P>We do not use your data for advertising, and we do not share it with third parties for marketing purposes.</P>
          </Section>

          <Section title="Institutional Accounts">
            <P>If you access MedLab through a university or medical school, your institution's administrator may have access to your performance data, including case scores, completion rates, and reasoning analytics. This is disclosed at the point of enrollment.</P>
            <P>Institutions are considered joint data controllers for the data their students generate within the platform. Our Data Processing Agreement (DPA) governs this relationship and is available upon request.</P>
          </Section>

          <Section title="Data Retention">
            <P>We retain your account and usage data for as long as your account is active. If you delete your account, we delete your personal data within 30 days, except where retention is required by law or for fraud prevention.</P>
            <P>Anonymised, aggregate performance data (e.g. average score on a case type) may be retained indefinitely for platform improvement.</P>
          </Section>

          <Section title="Cookies">
            <P>We use a small number of cookies that are strictly necessary for authentication and session management. We do not use advertising cookies or third-party tracking pixels.</P>
            <UL items={[
              "Session cookie — keeps you logged in",
              "CSRF token — protects form submissions from cross-site request forgery",
              "Preference cookie — stores settings like billing toggle state",
            ]} />
          </Section>

          <Section title="Your Rights">
            <P>Depending on your location, you may have rights under GDPR, FERPA, CCPA, or similar laws. In all cases, you can:</P>
            <UL items={[
              "Request a copy of the data we hold about you",
              "Request correction of inaccurate data",
              "Request deletion of your account and personal data",
              "Object to or restrict certain processing",
              "Export your data in a portable format",
            ]} />
            <P>To exercise any of these rights, email us at <a href="mailto:privacy@getmedlab.com" style={{ color: "#0066FF", textDecoration: "none" }}>privacy@getmedlab.com</a>. We will respond within 30 days.</P>
          </Section>

          <Section title="Security">
            <P>MedLab is built on Supabase infrastructure with encryption at rest and in transit (TLS 1.2+). Access to production data is restricted to core team members on a need-to-know basis. We conduct regular security reviews and respond to reported vulnerabilities promptly.</P>
            <P>If you discover a security issue, please disclose it responsibly to <a href="mailto:security@getmedlab.com" style={{ color: "#0066FF", textDecoration: "none" }}>security@getmedlab.com</a>.</P>
          </Section>

          <Section title="Children">
            <P>MedLab is intended for medical students and healthcare professionals. We do not knowingly collect data from anyone under the age of 16. If you believe a minor has created an account, contact us and we will remove it promptly.</P>
          </Section>

          <Section title="Changes to This Policy">
            <P>We may update this policy as the platform evolves. For material changes, we will notify active users by email at least 14 days before the change takes effect. Continued use after that date constitutes acceptance.</P>
          </Section>

          <Section title="Contact">
            <P>For privacy questions or to exercise your rights, email <a href="mailto:privacy@getmedlab.com" style={{ color: "#0066FF", textDecoration: "none" }}>privacy@getmedlab.com</a>. We aim to respond within 30 days.</P>
          </Section>

        </div>
      </div>
      </FadeUp>

      <SharedFooter />
    </div>
  )
}
