export const metadata = {
  robots: "noindex, nofollow",
}

export default function DeckPage() {
  return (
    <div style={{ margin: 0, padding: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#000" }}>
      <embed
        src="/MedLab%20500%20Pitch.pdf"
        type="application/pdf"
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  )
}
