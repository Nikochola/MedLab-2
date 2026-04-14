import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components"

interface SetupLinkEmailProps {
  fullName: string
  institutionName: string
  setupUrl: string
}

export default function SetupLinkEmail({ fullName, institutionName, setupUrl }: SetupLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Complete your MedLab administrator setup for ${institutionName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>Finish your MedLab workspace setup</Heading>
            <Text style={text}>Hello {fullName},</Text>
            <Text style={text}>
              Your access to MedLab has been confirmed. Use the button below to create your
              administrator account and finish setting up your workspace for{" "}
              <strong>{institutionName}</strong>.
            </Text>
            <Button href={setupUrl} style={button}>
              Complete Administrator Setup
            </Button>
            <Text style={muted}>This setup link expires in 7 days and can only be used once.</Text>
          </Section>
          <Hr style={divider} />
          <Section>
            <Text style={footer}>If the button does not work, copy and paste this link:</Text>
            <Text style={link}>{setupUrl}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 12px"
}

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "24px"
}

const heading: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "22px",
  marginBottom: "16px"
}

const text: React.CSSProperties = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 12px"
}

const button: React.CSSProperties = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  marginTop: "8px",
  padding: "12px 18px",
  textDecoration: "none"
}

const muted: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "16px"
}

const divider: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "18px 0"
}

const footer: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  marginBottom: "4px"
}

const link: React.CSSProperties = {
  color: "#1d4ed8",
  fontSize: "12px",
  wordBreak: "break-all"
}
