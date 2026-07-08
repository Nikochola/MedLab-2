import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArticleTemplate } from "@/components/sections/ArticleTemplate"
import { articles, getArticleBySlug } from "@/lib/articles"

type PageProps = {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const article = getArticleBySlug(params.slug)

  if (!article) {
    return {}
  }

  return {
    title: article.seoTitle,
    description: article.metaDescription,
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      type: "article",
      title: article.seoTitle,
      description: article.metaDescription,
      url: `/blog/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      images: [
        {
          url: article.heroImage,
          width: 1200,
          height: 630,
          alt: article.heroAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle,
      description: article.metaDescription,
      images: [article.heroImage],
    },
  }
}

export default function ArticlePage({ params }: PageProps) {
  const article = getArticleBySlug(params.slug)

  if (!article) {
    notFound()
  }

  const relatedArticles = articles
    .filter((candidate) => candidate.slug !== article.slug)
    .filter((candidate) => candidate.category === article.category || candidate.internalLinkTargets.some((link) => article.internalLinkTargets.some((articleLink) => articleLink.href === link.href)))
    .slice(0, 3)

  return <ArticleTemplate article={article} relatedArticles={relatedArticles.length > 0 ? relatedArticles : articles.filter((candidate) => candidate.slug !== article.slug).slice(0, 3)} />
}
