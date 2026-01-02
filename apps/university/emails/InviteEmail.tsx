import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface InviteEmailProps {
  orgName: string
  roleLabel: string
  inviteUrl: string
  logoUrl: string
}

export default function InviteEmail({ orgName, roleLabel, inviteUrl, logoUrl }: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You have been invited to ${orgName}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={logoUrl} width="160" height="48" alt="MedLab Interactive" style={logo} />
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>You are invited</Heading>
            <Text style={text}>{`You have been invited to ${orgName} as a ${roleLabel}.`}</Text>
            <Text style={text}>Use the button below to set your password and join your workspace.</Text>
            <Button style={button} href={inviteUrl}>
              Create account
            </Button>
            <Text style={muted}>This invite link expires in 7 days.</Text>
          </Section>

          <Hr style={divider} />

          <Section>
            <Text style={footer}>If the button does not work, copy and paste this URL:</Text>
            <Text style={link}>{inviteUrl}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
  margin: 0,
  padding: "32px 12px",
  color: "#0f172a",
}

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "24px",
}

const logoSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "16px",
}

const logo: React.CSSProperties = {
  display: "inline-block",
}

const contentSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "24px",
}

const heading: React.CSSProperties = {
  fontSize: "24px",
  margin: "8px 0 12px",
  fontWeight: 700,
}

const text: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 12px",
}

const button: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  borderRadius: "10px",
  padding: "12px 20px",
  textDecoration: "none",
  display: "inline-block",
}

const muted: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "16px",
}

const divider: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "16px 0",
}

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
}

const link: React.CSSProperties = {
  fontSize: "12px",
  color: "#1d4ed8",
  wordBreak: "break-all",
}
