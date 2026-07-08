import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SharedFooter } from "@/components/sections/SharedFooter"
import { SharedNavbar } from "@/components/sections/SharedNavbar"
import type { Article } from "@/lib/articles"

const siteUrl = "https://medlabinteractive.com"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

export function ArticleTemplate({ article, relatedArticles }: { article: Article; relatedArticles: Article[] }) {
  const articleUrl = `${siteUrl}/blog/${article.slug}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seoTitle,
    description: article.metaDescription,
    image: [`${siteUrl}${article.heroImage}`],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "MedLab",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.svg`,
      },
    },
    mainEntityOfPage: articleUrl,
  }

  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SharedNavbar active="Blog" />

      <main>
        <section className="px-5 md:px-[80px]" style={{ paddingTop: 72, paddingBottom: 56 }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <Link href="/blog" style={{ fontSize: 13, color: "#0066FF", fontWeight: 700, textDecoration: "none" }}>
              Blog
            </Link>
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]" style={{ marginTop: 20 }}>
              <div>
                <p style={{ color: "#9B9A94", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 18px", textTransform: "uppercase" }}>
                  {article.category} · {formatDate(article.publishedAt)}
                </p>
                <h1 style={{ fontSize: "clamp(38px, 5vw, 68px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.04, margin: 0 }}>
                  {article.title}
                </h1>
                <p style={{ color: "#6B6A65", fontSize: 19, lineHeight: 1.65, margin: "24px 0 0", maxWidth: 720 }}>
                  {article.excerpt}
                </p>
              </div>
              <aside style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 16, padding: 22, alignSelf: "start" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9A94", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>
                  In This Guide
                </p>
                <nav className="flex flex-col gap-3">
                  {article.toc.map((item) => (
                    <a key={item.id} href={`#${item.id}`} style={{ fontSize: 14, color: "#3D3C38", lineHeight: 1.35, textDecoration: "none" }}>
                      {item.label}
                    </a>
                  ))}
                </nav>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-5 md:px-[80px]" style={{ paddingBottom: 80 }}>
          <div className="grid gap-8 md:grid-cols-[minmax(0,720px)_280px]" style={{ maxWidth: 1040, margin: "0 auto", alignItems: "start" }}>
            <article style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 20, padding: "clamp(28px, 5vw, 56px)" }}>
              {article.sections.map((section) => (
                <section key={section.id} id={section.id} style={{ scrollMarginTop: 96, marginBottom: 44 }}>
                  <h2 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.12, margin: "0 0 18px" }}>
                    {section.heading}
                  </h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph} style={{ color: "#3D3C38", fontSize: 16, lineHeight: 1.78, margin: "0 0 18px" }}>
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="flex flex-col gap-2" style={{ margin: "20px 0 0", paddingLeft: 22 }}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet} style={{ color: "#3D3C38", fontSize: 15, lineHeight: 1.65 }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              <section style={{ borderTop: "1px solid #E8E6DF", paddingTop: 36, marginTop: 8 }}>
                <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.035em", margin: "0 0 20px" }}>
                  FAQ
                </h2>
                <div className="flex flex-col gap-4">
                  {article.faqs.map((faq) => (
                    <div key={faq.question} style={{ background: "#F8F7F2", border: "1px solid #E8E6DF", borderRadius: 12, padding: 20 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
                        {faq.question}
                      </h3>
                      <p style={{ color: "#6B6A65", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ borderTop: "1px solid #E8E6DF", paddingTop: 32, marginTop: 36 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                  Sources
                </h2>
                <ul className="flex flex-col gap-2" style={{ margin: 0, paddingLeft: 20 }}>
                  {article.sources.map((source) => (
                    <li key={source.url} style={{ color: "#6B6A65", fontSize: 14, lineHeight: 1.55 }}>
                      <a href={source.url} target="_blank" rel="noreferrer" style={{ color: "#0066FF", textDecoration: "none" }}>
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </article>

            <aside className="flex flex-col gap-5" style={{ position: "sticky", top: 92 }}>
              <div style={{ background: "#0E0F12", borderRadius: 16, padding: 24 }}>
                <p style={{ color: "#fff", fontSize: 19, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25, margin: "0 0 10px" }}>
                  Build clinical reasoning with cases.
                </p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
                  Practice ECGs, X-rays, and patient scenarios with AI-guided feedback.
                </p>
                <Button asChild className="w-full">
                  <Link href="/">Start Learning Free</Link>
                </Button>
              </div>

              <div style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 16, padding: 22 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9A94", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>
                  Internal Links
                </p>
                <div className="flex flex-col gap-3">
                  {article.internalLinkTargets.map((link) => (
                    <Link key={link.href} href={link.href} style={{ color: "#0066FF", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 16, padding: 22 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9A94", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>
                  Image Ideas
                </p>
                {article.imageSuggestions.map((image) => (
                  <p key={image.alt} style={{ color: "#6B6A65", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                    {image.alt}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="px-5 md:px-[80px]" style={{ background: "#F0EDE6", paddingTop: 72, paddingBottom: 72 }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4" style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>
                Related articles
              </h2>
              <Link href="/blog" style={{ color: "#0066FF", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                View all articles
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link key={related.slug} href={`/blog/${related.slug}`} style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 16, padding: 22, textDecoration: "none" }}>
                  <p style={{ color: "#9B9A94", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
                    {related.category}
                  </p>
                  <h3 style={{ color: "#0E0F12", fontSize: 18, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25, margin: "0 0 10px" }}>
                    {related.title}
                  </h3>
                  <p style={{ color: "#6B6A65", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                    {related.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SharedFooter />
    </div>
  )
}
