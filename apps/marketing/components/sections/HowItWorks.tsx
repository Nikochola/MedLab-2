"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const steps = [
    {
        number: "01",
        title: "Read the Chief Complaint",
        desc: "Start with a realistic patient scenario, vitals, and initial presentation.",
        color: "bg-blue-100",
        text: "text-blue-600"
    },
    {
        number: "02",
        title: "Order Diagnostic Tests",
        desc: "Request labs, imaging, or EKGs. Review the actual results dynamically.",
        color: "bg-purple-100",
        text: "text-purple-600"
    },
    {
        number: "03",
        title: "Discuss with AI Attending",
        desc: "Bounce ideas off your AI mentor. Get pushed to think critically.",
        color: "bg-orange-100",
        text: "text-orange-600"
    },
    {
        number: "04",
        title: "Confirm Diagnosis",
        desc: "Submit your final diagnosis and treatment plan for comprehensive feedback.",
        color: "bg-teal-100",
        text: "text-teal-600"
    }
];

export function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            // Animate the line drawing down
            gsap.fromTo(".timeline-line",
                { scaleY: 0, transformOrigin: "top center" },
                {
                    scaleY: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".how-it-works-section",
                        start: "top center",
                        end: "bottom center",
                        scrub: 1,
                    }
                }
            );

            // Staggered reveal for the step cards
            gsap.from(".step-card", {
                scrollTrigger: {
                    trigger: ".how-it-works-section",
                    start: "top 60%",
                },
                x: (index) => index % 2 === 0 ? -50 : 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: "back.out(1.5)",
            });

            // Floating abstract shapes
            gsap.to(".floating-shape", {
                y: "random(-20, 20)",
                x: "random(-20, 20)",
                rotation: "random(-15, 15)",
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                stagger: 0.5
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="how-it-works-section py-24 md:py-32 bg-transparent relative overflow-hidden">
            {/* Decorative Floating Shapes */}
            <div className="floating-shape absolute top-[20%] left-[10%] w-32 h-32 rounded-full border-[12px] border-blue-100 opacity-60"></div>
            <div className="floating-shape absolute bottom-[20%] right-[10%] w-24 h-24 rounded-3xl bg-purple-100 rotate-12 opacity-60"></div>

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20 max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                        How It <span className="text-[#0066FF]">Works</span>
                    </h2>
                    <p className="text-lg text-slate-600 font-bold leading-relaxed">
                        A seamless transition from theory to practice in four interactive steps.
                    </p>
                </div>

                <div className="relative">
                    {/* Vertical Timeline Line */}
                    <div className="timeline-line hidden md:block absolute left-1/2 top-0 bottom-0 w-2 bg-slate-100 -translate-x-1/2 rounded-full"></div>

                    <div className="space-y-12 md:space-y-0 relative">
                        {steps.map((step, index) => {
                            const isEven = index % 2 === 0;
                            return (
                                <div key={index} className={`step-card relative flex flex-col md:flex-row items-center justify-between ${isEven ? "md:flex-row-reverse" : ""} md:h-[200px]`}>

                                    {/* Empty space for alternating layout */}
                                    <div className="hidden md:block md:w-5/12"></div>

                                    {/* Center Timeline Node */}
                                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white border-[4px] border-slate-200 rounded-full items-center justify-center shadow-playful-sm z-10 transition-all duration-300 hover:border-[#0066FF] hover:bg-blue-50">
                                        <span className={`font-black ${step.text}`}>{step.number}</span>
                                    </div>

                                    {/* Content Card */}
                                    <div className="w-full md:w-5/12">
                                        <div className="bg-white p-8 rounded-[32px] border-[4px] border-slate-200 shadow-playful hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_12px_0_0_#e2e8f0]">
                                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 ${step.color} ${step.text} font-black text-xl md:hidden`}>
                                                {step.number}
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 mb-3">{step.title}</h3>
                                            <p className="text-slate-600 font-bold leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
