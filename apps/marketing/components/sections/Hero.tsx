"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { buildStudentAppUrl } from "@/app/lib/runtimeUrls";
import { ArrowDown, Stethoscope, Microscope, Pill } from "lucide-react";

export function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "elastic.out(1, 0.75)" } });

            tl.from(".hero-badge", { y: 20, opacity: 0, duration: 0.8 })
                .from(".hero-headline", {
                    y: 40,
                    opacity: 0,
                    duration: 1,
                }, "-=0.6")
                .from(".hero-sub", { y: 20, opacity: 0, duration: 0.8 }, "-=0.8")
                .from(".hero-cta", { y: 20, opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.6")
                .from(".hero-visual", { scale: 0.8, opacity: 0, duration: 1.2, ease: "elastic.out(1, 0.5)" }, "-=0.8")
                .from(".hero-scroll", { opacity: 0, y: -10, duration: 0.6 }, "-=0.4");

            // Continuous bounce for the scroll indicator
            gsap.to(".hero-scroll-icon", {
                y: 10,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut",
                duration: 1
            });

            // Floating medical decorative icons
            gsap.to(".float-icon-1", { y: -20, rotation: 10, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });
            gsap.to(".float-icon-2", { y: 25, x: 10, rotation: -15, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" });
            gsap.to(".float-icon-3", { opacity: 0.8, scale: 1.1, rotation: 20, duration: 3.5, repeat: -1, yoyo: true, ease: "sine.inOut" });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative overflow-hidden bg-transparent pt-24 pb-16 md:pb-24">
            <div className="mx-auto w-full max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-12">

                {/* Left Side: Copy & CTAs */}
                <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start z-10 w-full">
                    <div className="hero-badge mb-8 inline-flex items-center rounded-2xl border-[3px] border-slate-200 shadow-playful-sm bg-white px-5 py-2 text-sm font-black text-slate-600">
                        <span className="mr-3 flex h-3 w-3 rounded-full bg-[#0066FF] animate-pulse"></span>
                        Now Available for Students
                    </div>

                    <h1 className="hero-headline text-5xl md:text-6xl lg:text-[76px] font-black tracking-tight leading-[1.05] mb-6 text-slate-900">
                        Learn Medicine <br className="hidden md:block" /> by <span className="text-[#0066FF]">Solving Cases</span>
                    </h1>

                    <p className="hero-sub text-slate-600 text-lg md:text-xl max-w-lg mb-10 font-bold leading-relaxed">
                        Train with interactive ECGs, X-rays, and patient scenarios designed to build real diagnostic confidence.
                    </p>

                    <div className="flex flex-col w-full max-w-[380px] gap-5">
                        <Link
                            href={buildStudentAppUrl("/student/signup")}
                            className="hero-cta w-full text-center rounded-[24px] border-[4px] border-[#0052CC] bg-[#0066FF] shadow-playful-blue px-8 py-5 text-lg font-black tracking-wide text-white transition-all hover:-translate-y-1 hover:brightness-110 active:translate-y-[8px] active:shadow-none"
                        >
                            START LEARNING
                        </Link>
                        <Link
                            href="/institutions"
                            className="hero-cta w-full text-center rounded-[24px] border-[4px] border-slate-200 bg-white shadow-playful px-8 py-5 text-lg font-black tracking-wide text-slate-700 transition-all hover:-translate-y-1 hover:bg-slate-50 hover:text-slate-900 active:translate-y-[8px] active:shadow-none"
                        >
                            ARE YOU AN INSTITUTION?
                        </Link>
                    </div>
                </div>

                {/* Right Side: Illustration */}
                <div className="hero-visual flex-1 flex justify-center md:justify-end relative w-full pt-8 md:pt-0">
                    {/* Decorative background blob */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] md:w-[130%] aspect-square bg-[#E0F2FE] rounded-full blur-3xl opacity-60 -z-10"></div>

                    {/* Floating Icons */}
                    <div className="float-icon-1 absolute top-10 left-0 md:-left-10 bg-white p-4 rounded-3xl border-[3px] border-slate-200 shadow-playful-sm z-20">
                        <Stethoscope className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="float-icon-2 absolute bottom-20 right-0 md:-right-10 bg-orange-100 p-4 rounded-full border-[3px] border-orange-200 shadow-playful-sm z-20">
                        <Pill className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="float-icon-3 absolute top-32 right-10 md:right-0 bg-purple-100 p-3 rounded-2xl border-[3px] border-purple-200 shadow-playful-sm -z-0">
                        <Microscope className="w-6 h-6 text-purple-500" />
                    </div>

                    <img
                        src="/hero-illustration.png"
                        alt="Medical student playing on interactive tablet"
                        width={600}
                        height={600}
                        className="w-full max-w-[420px] lg:max-w-[550px] relative z-10"
                    />
                </div>
            </div>

            {/* Scroll indicator down bottom */}
            <div className="hero-scroll mx-auto flex justify-center mt-16 md:mt-24">
                <ArrowDown className="hero-scroll-icon w-8 h-8 text-slate-300" strokeWidth={3} />
            </div>
        </section>
    );
}
