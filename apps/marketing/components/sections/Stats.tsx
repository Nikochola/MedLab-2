"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const stats = [
    { value: "5000", label: "Active Students", prefix: "+" },
    { value: "250", label: "Clinical Cases", prefix: "" },
    { value: "50", label: "Institutions", prefix: "+" },
];

export function Stats() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            document.querySelectorAll(".counter").forEach((el) => {
                const target = parseFloat(el.getAttribute("data-target") || "0");
                gsap.from({ val: 0 }, {
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%"
                    },
                    val: target,
                    duration: 2.5,
                    ease: "power2.out",
                    onUpdate: function () {
                        el.textContent = Math.round(this.targets()[0].val).toString();
                    },
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="py-24 bg-transparent relative z-10">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-px md:bg-slate-300 rounded-[32px] overflow-hidden shadow-playful border-[4px] border-slate-200">

                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white p-12 text-center relative flex flex-col items-center justify-center border-[4px] border-slate-200 rounded-[32px] md:border-0 md:rounded-none shadow-playful md:shadow-none">
                            <div className="flex items-center justify-center font-black text-slate-900 transition-transform duration-300 hover:scale-110">
                                <span className="text-4xl md:text-5xl text-[#0066FF] mr-1">{stat.prefix}</span>
                                <span className="counter text-6xl md:text-7xl" data-target={stat.value}>0</span>
                            </div>
                            <div className="text-slate-500 font-bold mt-4 text-lg tracking-wide uppercase">{stat.label}</div>
                        </div>
                    ))}

                </div>
            </div>
        </section>
    );
}
