import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SharedFooter } from "@/components/sections/SharedFooter"
import { SharedNavbar } from "@/components/sections/SharedNavbar"
import { articleIdeas, articles } from "@/lib/articles"

export const metadata: Metadata = {
  title: "Clinical Reasoning Blog",
  description: "SEO articles and practical guides for clinical reasoning, ECG interpretation, X-ray practice, OSCE prep, and medical education.",
  alternates: {
    canonical: "/blog",
  },
}

export default function BlogPage() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar active="Blog" />

      <main>
        <section className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 56 }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <p style={{ color: "#0066FF", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>
              MedLab Blog
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <div style={{ maxWidth: 720 }}>
                <h1 style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.04, margin: 0 }}>
                  Clinical reasoning guides for medical students and educators.
                </h1>
                <p style={{ color: "#6B6A65", fontSize: 18, lineHeight: 1.65, margin: "22px 0 0" }}>
                  Practical articles on ECGs, X-rays, OSCEs, patient scenarios, AI simulation, and scalable feedback.
                </p>
              </div>
              <Button asChild>
                <Link href="/">Start Learning Free</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-5 md:px-[80px]" style={{ paddingBottom: 72 }}>
          <div className="grid gap-5 md:grid-cols-2" style={{ maxWidth: 1040, margin: "0 auto" }}>
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 20, padding: 28, textDecoration: "none" }}
              >
                <p style={{ color: "#9B9A94", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px" }}>
                  {article.category}
                </p>
                <h2 style={{ color: "#0E0F12", fontSize: 26, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.14, margin: "0 0 14px" }}>
                  {article.title}
                </h2>
                <p style={{ color: "#6B6A65", fontSize: 15, lineHeight: 1.65, margin: "0 0 20px" }}>
                  {article.excerpt}
                </p>
                <span style={{ color: "#0066FF", fontSize: 14, fontWeight: 700 }}>
                  Read article
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-5 md:px-[80px]" style={{ background: "#F0EDE6", paddingTop: 72, paddingBottom: 72 }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 28px" }}>
              SEO article ideas and search intent
            </h2>
            <div className="grid gap-4">
              {articleIdeas.map((idea, index) => (
                <div key={idea.title} style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 16, padding: 24 }}>
                  <p style={{ color: "#0066FF", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>
                    IDEA {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 12px" }}>
                    {idea.title}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <p style={{ color: "#3D3C38", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong>Keyword:</strong> {idea.primaryKeyword}
                    </p>
                    <p style={{ color: "#3D3C38", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong>CTA:</strong> {idea.suggestedCta}
                    </p>
                    <p style={{ color: "#3D3C38", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong>Intent:</strong> {idea.searchIntent}
                    </p>
                    <p style={{ color: "#3D3C38", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong>Reader problem:</strong> {idea.readerProblem}
                    </p>
                    <p style={{ color: "#3D3C38", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong>Business value:</strong> {idea.businessValue}
                    </p>
                    <p style={{ color: "#3D3C38", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong>Internal links:</strong> {idea.internalLinkTargets.map((link) => link.label).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SharedFooter />
    </div>
  )
}
