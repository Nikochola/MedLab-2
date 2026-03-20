---
name: landing-page-design
description: Design and build award-winning, high-retention landing pages with scroll animations, GSAP, and stunning visual design. Use when the user asks to create a landing page, hero section, marketing site, product homepage, or any conversion-focused web page. Primary target is Next.js (App Router) but applies to any React/HTML project. Always uses GSAP for scroll animations. Uses shadcn/ui + Tailwind unless specified otherwise. The style/theme must be defined by the user or clarified before building.
---

# Landing Page Design Skill

Build jaw-dropping, conversion-optimized landing pages that win design awards. Every page must feel alive, intentional, and completely original.

---

## Step 0 — Style Intake (MANDATORY before writing any code)

If the user hasn't specified a visual style, **ask before building**. You need to know:

1. **Style direction** — e.g. dark/moody, clean/minimal, bold/typographic, organic/nature, brutalist, futuristic, editorial, playful/illustrated, luxury/premium, retro
2. **Brand/product type** — what is being sold or communicated?
3. **Target audience** — who is this for?
4. **Color preferences** — any brand colors or restrictions?
5. **Key sections needed** — hero, features, testimonials, pricing, CTA, etc.

If the user provides a style (e.g. "dark minimal", "playful SaaS", "luxury real estate"), proceed directly to architecture.

---

## Step 1 — Architecture & Design Direction

### Project Setup (Next.js App Router — default)

```
/app
  /page.tsx              ← landing page root
  /layout.tsx
/components
  /sections
    /Hero.tsx
    /Features.tsx
    /Testimonials.tsx
    /Pricing.tsx
    /CTA.tsx
  /ui                    ← shadcn components
/lib
  /animations.ts         ← GSAP utilities
/public
  /fonts
```

For non-Next.js: adapt to the target framework (Vite+React, plain HTML, etc.). Same animation principles apply.

### Design System Commitment

Before writing a line of code, commit explicitly to:

| Decision | Example choices |
|---|---|
| **Typography** | Clash Display + Cabinet Grotesk / Playfair + DM Sans / Syne + Instrument Sans |
| **Color palette** | 1–2 dominant + 1 accent + neutrals. Never wishy-washy. |
| **Motion language** | Smooth cinematic / snappy/punchy / organic/fluid / mechanical/precise |
| **Layout signature** | Full-bleed asymmetric / editorial grid / overlapping layers / centered manifesto |
| **Texture/depth** | Grain overlay / glassmorphism / flat bold / deep shadows |

**CRITICAL**: Pick a direction and OWN it fully. Half-measures produce forgettable pages.

---

## Step 2 — GSAP Animation System

### Installation

```bash
npm install gsap @gsap/react
# or
npm install gsap  # and use useEffect with cleanup
```

### Core Animation Patterns

#### 1. Hero Entrance (Page Load)
```tsx
// components/sections/Hero.tsx
"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-eyebrow", { y: 20, opacity: 0, duration: 0.6 })
        .from(".hero-headline span", {
          y: "110%",
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
        }, "-=0.3")
        .from(".hero-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.4")
        .from(".hero-cta", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.3")
        .from(".hero-visual", { scale: 1.08, opacity: 0, duration: 1.2 }, "-=0.9");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return <div ref={containerRef}>{/* content */}</div>;
}
```

#### 2. ScrollTrigger Setup (Critical — add to layout or root component)
```tsx
// lib/animations.ts
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function registerGSAP() {
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
}

// In layout.tsx or a ClientInit component:
// "use client"
// useEffect(() => { registerGSAP(); }, []);
```

#### 3. Scroll-Triggered Reveals
```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    // Fade-up stagger for cards/features
    gsap.from(".feature-card", {
      scrollTrigger: {
        trigger: ".features-section",
        start: "top 75%",
        toggleActions: "play none none reverse",
      },
      y: 60,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: "power2.out",
    });

    // Horizontal text scrub
    gsap.to(".marquee-track", {
      scrollTrigger: {
        trigger: ".marquee-section",
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
      },
      x: "-30%",
      ease: "none",
    });

    // Parallax hero image
    gsap.to(".hero-bg", {
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: "25%",
      ease: "none",
    });

    // Scale reveal for full-bleed sections
    gsap.from(".scale-reveal", {
      scrollTrigger: {
        trigger: ".scale-reveal",
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
      scale: 0.92,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
    });

    // Counter animation
    document.querySelectorAll(".counter").forEach((el) => {
      const target = parseFloat(el.getAttribute("data-target") || "0");
      gsap.from({ val: 0 }, {
        scrollTrigger: { trigger: el, start: "top 85%" },
        val: target,
        duration: 2,
        ease: "power2.out",
        onUpdate: function () {
          el.textContent = Math.round(this.targets()[0].val).toString();
        },
      });
    });

  }, containerRef);

  return () => ctx.revert();
}, []);
```

#### 4. Cursor / Magnetic Effects (Premium Touch)
```tsx
// Magnetic button effect
useEffect(() => {
  const buttons = document.querySelectorAll(".magnetic-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("mousemove", (e: any) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    });
  });
}, []);
```

#### 5. Text Splitting for Headlines
```tsx
// Install: npm install gsap  (SplitText is in GSAP Club, use manual split for free)
function splitToSpans(text: string) {
  return text.split("").map((char, i) => (
    <span key={i} className="inline-block overflow-hidden">
      <span className="hero-char inline-block">
        {char === " " ? "\u00A0" : char}
      </span>
    </span>
  ));
}
// Then animate .hero-char with gsap stagger
```

---

## Step 3 — Section Blueprints

### Hero — 6 High-Impact Patterns

**Pattern A: Full-Bleed Cinematic**
- 100vh, video/image background with parallax
- Oversized headline overlapping the visual
- Minimal nav, one clear CTA
- Signature: `mix-blend-mode` on text for blended effect

**Pattern B: Split-Screen Manifesto**
- Left: large serif headline + body copy
- Right: floating 3D object or product visual
- Asymmetric grid (7/5 or 8/4 columns)
- On scroll: the two halves animate apart

**Pattern C: Bold Typography-First**
- Pure type, no images above the fold
- 3-5 lines of display text at 120–200px
- Subtle background texture (noise grain)
- Signature: one word in a contrasting accent color or inline icon

**Pattern D: Dashboard/Product Preview**
- Hero copy on left, interactive product mockup on right
- Mockup animates in with stagger (like OceanX globe effect)
- Trusted-by logos below the fold

**Pattern E: Editorial Magazine**
- Asymmetric type placement
- Image cutout floating outside its container
- Fine horizontal rules and refined spacing (like Anima.io)

**Pattern F: Illustrated/Playful**
- Illustrated mascot or floating 3D elements around headline
- Warm/pastel palette
- Bouncy spring animations on load

### Features Section
```tsx
// Bento grid approach
<section className="features-section py-32">
  <div className="grid grid-cols-12 gap-4 max-w-7xl mx-auto px-6">
    {/* Large card — spans 7 cols */}
    <div className="feature-card col-span-7 rounded-3xl p-10 bg-card ...">
    {/* Tall card — spans 5 cols, 2 rows */}
    <div className="feature-card col-span-5 row-span-2 ...">
    {/* Two small cards */}
    <div className="feature-card col-span-4 ...">
    <div className="feature-card col-span-3 ...">
  </div>
</section>
```

### Marquee / Social Proof Strip
```tsx
// Infinite scroll marquee (CSS only, GSAP optional)
<div className="overflow-hidden whitespace-nowrap py-6 bg-accent">
  <div className="marquee-track inline-flex gap-16 animate-marquee">
    {[...logos, ...logos].map((logo, i) => <Logo key={i} {...logo} />)}
  </div>
</div>

// tailwind.config.js
// animation: { marquee: "marquee 30s linear infinite" }
// keyframes: { marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } } }
```

### Stats / Numbers Section
```tsx
<div className="grid grid-cols-3 gap-px bg-border">
  {stats.map(stat => (
    <div key={stat.label} className="bg-background p-12">
      <div className="counter text-7xl font-bold" data-target={stat.value}>0</div>
      <div className="text-muted-foreground mt-2">{stat.label}</div>
    </div>
  ))}
</div>
```

### CTA Section — Conversion-Optimized
- Large, high-contrast, single button
- Urgency copy without being pushy
- Optional email capture (shadcn Input + Button)
- Signature: full-bleed with bold background color change

---

## Step 4 — Tailwind + shadcn Setup

### Tailwind Config Additions
```js
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Replace with chosen fonts
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
} satisfies Config;
```

### Font Loading (Next.js)
```tsx
// app/layout.tsx
import { localFont } from "next/font/local";
// or from Google:
import { Playfair_Display, DM_Sans } from "next/font/google";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
```

### shadcn Components to Always Consider
- `Button` (with variants: default, ghost, outline)  
- `Badge` — for eyebrow labels, tags  
- `Card` — for feature/bento grid items  
- `Input` + `Label` — email capture  
- `Separator` — visual dividers  
- `Sheet` — mobile nav drawer  
- `Tooltip` — interactive detail on hover  

---

## Step 5 — Performance & Quality Standards

### Non-Negotiable Requirements
- [ ] All GSAP contexts cleaned up with `ctx.revert()` on unmount
- [ ] `"use client"` on all animation components
- [ ] `ScrollTrigger.refresh()` called after fonts/images load
- [ ] Images: `next/image` with `priority` on hero, lazy on others
- [ ] No layout shift: reserve space for images with aspect ratios
- [ ] Mobile-first responsive: hero works at 375px
- [ ] Dark/light mode handled via CSS variables (if applicable)
- [ ] Reduced motion: wrap complex animations in `@media (prefers-reduced-motion: no-preference)` or check `window.matchMedia`

### Reduced Motion Check
```tsx
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (!prefersReducedMotion) {
  // run GSAP animations
}
```

---

## Step 6 — Design Excellence Rules

These are non-negotiable aesthetic standards:

### Typography
- **Display text**: 80px–200px. Let it breathe or let it bleed. No in-between.
- **Line heights**: Display 0.9–1.0, body 1.6–1.7
- **Font pairing**: One serif/expressive display + one clean humanist sans
- **Never**: All caps on body text. Generic system fonts.

### Color
- **Commit**: Pick 1–2 dominant colors and 1 sharp accent. Own the palette.
- **Contrast**: Text must pass WCAG AA minimum
- **Backgrounds**: Off-white (#F8F7F4, #FAFAF8) beats pure white. Near-black (#0D0D0D, #111111) beats pure black.
- **Never**: Generic purple gradients. Random colorful gradients with no palette logic.

### Spacing
- Section padding: `py-24` to `py-40` (generous)
- Container max-width: `max-w-7xl` with `px-6 md:px-10`
- Let designs breathe — negative space is part of the design

### Motion Principles
- **Entrance animations**: 0.6–1.0s, `power2.out` or `expo.out`
- **Scroll scrubs**: `ease: "none"` for parallax
- **Stagger**: 0.08–0.15s between elements
- **Spring/elastic**: Only for playful brands, not luxury/minimal
- **Never**: Bouncing elements on serious/professional sites. Animation for animation's sake.

### Originality
- Break the grid intentionally at least once per page
- Use one unexpected typographic treatment (oversized, rotated, clipped, outlined)
- Design should have one "signature moment" — something a user screenshots
- **Never**: Copy a template. Every generation must be genuinely new.

---

## Step 7 — Full Page Assembly Template

```tsx
// app/page.tsx
import { Hero } from "@/components/sections/Hero";
import { LogoStrip } from "@/components/sections/LogoStrip";
import { Features } from "@/components/sections/Features";
import { Stats } from "@/components/sections/Stats";
import { Testimonials } from "@/components/sections/Testimonials";
import { Pricing } from "@/components/sections/Pricing";
import { CTA } from "@/components/sections/CTA";
import { Footer } from "@/components/sections/Footer";
import { GSAPInit } from "@/components/GSAPInit"; // registers ScrollTrigger

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <GSAPInit />
      <Hero />
      <LogoStrip />
      <Features />
      <Stats />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
```

---

## Style Reference Library

Use these as inspiration, never as templates to copy:

| Style | Reference sites | Key characteristics |
|---|---|---|
| Organic/Nature | Anima.io, Linear.app | Muted sage/stone, editorial type, floating objects |
| Immersive/Epic | OceanX, Apple | Full-bleed visuals, cinematic pacing, 3D depth |
| Playful/Illustrated | Duolingo, Genie | Character-forward, floating elements, spring animations |
| Bold/Typographic | MoMoney, Swirlzy | Headline IS the design, tight grid, flat color |
| Luxury/Premium | Jesko Jets | Dark, dramatic, oversized type asymmetry |
| Clean Product SaaS | Cal.com, ElevenLabs | Product preview hero, social proof, functional clarity |
| Editorial/Studio | Studio Tyrsa | White space as design, refined type, minimal color |

---

## Common Mistakes to Avoid

- ❌ Generic hero layout: nav → headline → subtext → button → mockup (centered, boring)
- ❌ `Inter` or `Roboto` as display font
- ❌ Purple gradient on white = instant "AI made this" look
- ❌ Animations without purpose (random floating dots everywhere)
- ❌ GSAP without cleanup → memory leaks in Next.js
- ❌ No mobile consideration (hero breaks at 375px)
- ❌ Skipping the style intake → building the wrong aesthetic
- ❌ Every section using the same layout pattern
- ❌ CTA that doesn't stand out from the rest of the page
