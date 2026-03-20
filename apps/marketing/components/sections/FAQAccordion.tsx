"use client"

import { useState, useRef, useEffect } from "react"

type FAQItem = { q: string; a: string }

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 18 18" fill="none"
      style={{ flexShrink: 0, transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#9B9A94" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FAQItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!bodyRef.current) return
    setHeight(open ? bodyRef.current.scrollHeight : 0)
  }, [open])

  return (
    <div style={{ borderBottom: "1px solid #E8E6DF" }}>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between text-left"
        style={{ padding: "20px 0", background: "none", border: "none", cursor: "pointer", gap: 16 }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#0E0F12", letterSpacing: "-0.01em" }}>{q}</span>
        <ChevronIcon open={open} />
      </button>
      <div
        ref={bodyRef}
        style={{
          height,
          overflow: "hidden",
          transition: "height 0.25s ease",
        }}
      >
        <p style={{ fontSize: 14, color: "#6B6A65", lineHeight: 1.7, margin: "0 0 20px", paddingRight: 32 }}>{a}</p>
      </div>
    </div>
  )
}

export function FAQAccordion({ items, title = "Common questions" }: { items: FAQItem[]; title?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div style={{ marginTop: 80 }}>
      <h2 style={{ fontWeight: 700, fontSize: "clamp(24px, 3vw, 36px)", color: "#0E0F12", letterSpacing: "-0.03em", margin: "0 0 8px" }}>
        {title}
      </h2>
      <div style={{ borderTop: "1px solid #E8E6DF", marginTop: 24 }}>
        {items.map(({ q, a }, i) => (
          <FAQItem
            key={q}
            q={q}
            a={a}
            open={openIdx === i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          />
        ))}
      </div>
    </div>
  )
}
