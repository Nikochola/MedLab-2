"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { HeartPulse, Brain, Microscope, Stethoscope } from "lucide-react";

export function Features() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) return;

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

            // Bouncy icon effect on hover for the desktop
            const cards = document.querySelectorAll(".feature-card");
            cards.forEach((card) => {
                card.addEventListener("mouseenter", () => {
                    gsap.to(card.querySelector(".feature-icon"), {
                        scale: 1.15,
                        rotate: 8,
                        duration: 0.4,
                        ease: "back.out(2)"
                    });
                });
                card.addEventListener("mouseleave", () => {
                    gsap.to(card.querySelector(".feature-icon"), {
                        scale: 1,
                        rotate: 0,
                        duration: 0.4,
                        ease: "back.out(2)"
                    });
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="features-section py-24 md:py-32 bg-transparent relative z-10">
            <div className="max-w-6xl mx-auto px-6">

                <div className="text-center mb-20 max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                        Stop Memorizing. <br /> <span className="text-[#0066FF]">Start Diagnosing.</span>
                    </h2>
                    <p className="text-lg text-slate-600 font-bold leading-relaxed">
                        Engage with highly realistic, AI-driven medical cases that respond to your reasoning, test choices, and final diagnoses.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[300px]">

                    {/* Large Card (7 cols) */}
                    <div className="feature-card col-span-1 md:col-span-7 rounded-[32px] p-10 bg-white border-[4px] border-slate-200 shadow-playful flex flex-col justify-between overflow-hidden relative group transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#e2e8f0]">
                        <div className="z-10 relative">
                            <div className="feature-icon w-16 h-16 rounded-[20px] bg-blue-100 flex items-center justify-center mb-6 border-[3px] border-blue-200 shadow-playful-sm">
                                <HeartPulse className="w-8 h-8 text-[#0066FF]" strokeWidth={3} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-3">Live ECGs & Vitals</h3>
                            <p className="text-slate-600 font-bold max-w-[320px] leading-relaxed">Interpret dynamic 12-lead ECGs and real-time telemetry just like you would on the wards.</p>
                        </div>
                        {/* Playful abstract shape */}
                        <div className="absolute right-[-10%] bottom-[-20%] w-[350px] h-[350px] bg-[#E0F2FE] rounded-full blur-3xl opacity-60 group-hover:bg-[#d1eeff] transition-colors duration-700 -z-0"></div>
                    </div>

                    {/* Tall Card (5 cols, 2 rows) */}
                    <div className="feature-card col-span-1 md:col-span-5 md:row-span-2 rounded-[32px] p-10 md:p-14 bg-[#0066FF] border-[4px] border-[#0052CC] shadow-[0_8px_0_0_#0052cc] text-white flex flex-col items-center justify-center text-center relative overflow-hidden group transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#0052cc]">
                        <div className="feature-icon w-24 h-24 rounded-[28px] bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border-[3px] border-white/30 shadow-[0_4px_0_0_rgba(255,255,255,0.2)]">
                            <Brain className="w-12 h-12 text-white" strokeWidth={3} />
                        </div>
                        <h3 className="text-3xl font-black mb-5 leading-tight">AI Socratic Tutor</h3>
                        <p className="text-blue-100 font-bold text-lg leading-relaxed px-2">Never get stuck. Your AI Attending guides you with hints and questions, enforcing clinical reasoning over pure memorization.</p>

                        {/* Background elements */}
                        <div className="absolute top-[-10%] left-[-10%] w-[250px] h-[250px] bg-white text-white rounded-full blur-[90px] opacity-20"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[200px] h-[200px] bg-[#00f7ff] rounded-full blur-[70px] opacity-30"></div>
                    </div>

                    {/* Medium Card (4 cols) */}
                    <div className="feature-card col-span-1 md:col-span-4 rounded-[32px] p-8 md:p-10 bg-white border-[4px] border-slate-200 shadow-playful flex flex-col justify-between relative group overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#e2e8f0]">
                        <div className="z-10">
                            <div className="feature-icon w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-6 border-[3px] border-purple-200 shadow-playful-sm">
                                <Microscope className="w-7 h-7 text-purple-600" strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 mt-auto">Lab Panels</h3>
                            <p className="text-slate-600 font-bold leading-relaxed">Order and interpret complete CBCs, BMPs, and specific assays effortlessly.</p>
                        </div>
                        {/* Abstract bg */}
                        <div className="absolute left-[-20%] bottom-[-20%] w-[200px] h-[200px] bg-purple-50 rounded-full blur-2xl opacity-60 -z-0"></div>
                    </div>

                    {/* Small Card (3 cols) */}
                    <div className="feature-card col-span-1 md:col-span-3 rounded-[32px] p-8 md:p-10 bg-white border-[4px] border-slate-200 shadow-playful flex flex-col justify-between relative group overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#e2e8f0]">
                        <div className="z-10">
                            <div className="feature-icon w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-6 border-[3px] border-orange-200 shadow-playful-sm">
                                <Stethoscope className="w-7 h-7 text-orange-600" strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 mt-auto">Physical Exams</h3>
                            <p className="text-slate-600 font-bold leading-relaxed">Extract critical findings from interactive assessments.</p>
                        </div>
                        {/* Abstract bg */}
                        <div className="absolute right-[-20%] top-[-20%] w-[150px] h-[150px] bg-orange-50 rounded-full blur-2xl opacity-60 -z-0"></div>
                    </div>

                </div>
            </div>
        </section>
    );
}
