import * as React from "react"
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components"

interface VerificationCodeEmailProps {
  fullName: string
  institutionName: string
  code: string
}

export default function VerificationCodeEmail({ fullName, institutionName, code }: VerificationCodeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your MedLab verification code: ${code}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={heading}>Email verification</Heading>
            <Text style={text}>Hello {fullName},</Text>
            <Text style={text}>
              Enter this code to continue your MedLab administrator setup for{" "}
              <strong>{institutionName}</strong>:
            </Text>
            <div style={codeBox}>
              <Text style={codeText}>{code}</Text>
            </div>
            <Text style={muted}>This code expires in 15 minutes.</Text>
          </Section>
          <Hr style={divider} />
          <Section>
            <Text style={footer}>
              If you did not request this code, you can safely ignore this email.
            </Text>
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

const codeBox: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  margin: "16px 0",
  padding: "20px",
  textAlign: "center"
}

const codeText: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "36px",
  fontWeight: 700,
  letterSpacing: "0.25em",
  margin: 0
}

const muted: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "8px"
}

const divider: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "18px 0"
}

const footer: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "11px"
}
