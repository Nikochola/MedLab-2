import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "MedLab clinical reasoning platform preview"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#F8F7F2",
          color: "#0E0F12",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid #E8E6DF",
            borderRadius: 32,
            boxShadow: "0 28px 80px rgba(14, 15, 18, 0.14)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: 56,
            width: "100%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <div
              style={{
                alignItems: "center",
                background: "#0066FF",
                borderRadius: 18,
                color: "#FFFFFF",
                display: "flex",
                fontSize: 34,
                fontWeight: 800,
                height: 64,
                justifyContent: "center",
                width: 64,
              }}
            >
              M
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>MedLab</div>
              <div style={{ color: "#6B6A65", fontSize: 20, fontWeight: 600 }}>
                Clinical reasoning platform
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
            <div style={{ color: "#0066FF", fontSize: 28, fontWeight: 800 }}>
              Learn medicine by solving cases
            </div>
            <div style={{ fontSize: 68, fontWeight: 850, lineHeight: 1.04 }}>
              Build real diagnostic confidence.
            </div>
            <div style={{ color: "#6B6A65", fontSize: 30, lineHeight: 1.35 }}>
              Interactive ECGs, X-rays, and patient scenarios with AI-guided feedback.
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {["ECG practice", "Radiology", "AI tutor"].map((item) => (
              <div
                key={item}
                style={{
                  background: "#EEF3FF",
                  border: "2px solid #C7D9FF",
                  borderRadius: 999,
                  color: "#0055D6",
                  fontSize: 22,
                  fontWeight: 750,
                  padding: "14px 22px",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  )
}
