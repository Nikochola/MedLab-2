"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Star } from "lucide-react";

const testimonials = [
    {
        quote: "MedLab completely changed how I approach clinical reasoning. The AI Attending pushes my logic without just giving me the answer.",
        name: "Sarah J.",
        role: "M3, Harvard Medical School",
        avatar: "bg-blue-200 text-blue-800"
    },
    {
        quote: "Finally, a platform that feels like real wards. Ordering labs and interpreting ECGs dynamically builds so much more confidence.",
        name: "David K.",
        role: "Resident PGY-1",
        avatar: "bg-purple-200 text-purple-800"
    },
    {
        quote: "The interface is gorgeous and bouncing between patient cases is actually... fun? Highly recommended for step prep.",
        name: "Emily R.",
        role: "M2, UCSF",
        avatar: "bg-orange-200 text-orange-800"
    }
];

export function Testimonials() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            // Stagger entrance for testimonial cards
            gsap.from(".testimonial-card", {
                scrollTrigger: {
                    trigger: ".testimonials-section",
                    start: "top 70%",
                    toggleActions: "play none none reverse",
                },
                y: 80,
                opacity: 0,
                scale: 0.95,
                duration: 0.8,
                stagger: 0.15,
                ease: "back.out(1.2)"
            });

            // Star rotation on hover
            const cards = document.querySelectorAll(".testimonial-card");
            cards.forEach((card) => {
                card.addEventListener("mouseenter", () => {
                    gsap.to(card.querySelectorAll(".star-icon"), {
                        rotate: 180,
                        scale: 1.2,
                        stagger: 0.05,
                        duration: 0.3,
                        ease: "back.out"
                    });
                });
                card.addEventListener("mouseleave", () => {
                    gsap.to(card.querySelectorAll(".star-icon"), {
                        rotate: 0,
                        scale: 1,
                        duration: 0.4
                    });
                });
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="testimonials-section py-24 md:py-32 bg-transparent relative border-t-2 border-slate-100">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                        Loved By <span className="text-purple-500">Students</span>
                    </h2>
                    <p className="text-lg text-slate-600 font-bold max-w-xl mx-auto">
                        Don&apos;t just take our word for it. Here is what medical students and residents are saying about MedLab.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((test, index) => (
                        <div key={index} className="testimonial-card bg-white p-8 rounded-[32px] border-[4px] border-slate-200 shadow-playful flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#e2e8f0]">

                            <div className="flex gap-1 mb-6 text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="star-icon w-5 h-5 fill-current" />
                                ))}
                            </div>

                            <p className="text-slate-700 font-medium text-lg mb-8 leading-relaxed">
                                &quot;{test.quote}&quot;
                            </p>

                            <div className="flex items-center gap-4 mt-auto border-t-2 border-slate-100 pt-6">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 border-white shadow-sm ${test.avatar}`}>
                                    {test.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{test.name}</div>
                                    <div className="text-sm font-semibold text-slate-500">{test.role}</div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
