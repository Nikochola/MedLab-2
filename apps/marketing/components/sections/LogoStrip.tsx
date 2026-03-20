import React from "react";

const logos = [
    "Harvard Medical School",
    "Johns Hopkins",
    "UCSF Health",
    "Mayo Clinic",
    "Cleveland Clinic",
    "Penn Medicine",
    "Stanford Medicine",
];

export function LogoStrip() {
    return (
        <section className="overflow-hidden whitespace-nowrap py-12 bg-white border-y-2 border-slate-100 relative">
            {/* Soft fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div className="marquee-track inline-flex items-center gap-16 md:gap-24 animate-marquee pl-16 md:pl-24">
                {[...logos, ...logos, ...logos, ...logos].map((logo, i) => (
                    <span key={i} className="text-xl md:text-2xl font-black text-slate-300">
                        {logo}
                    </span>
                ))}
            </div>
        </section>
    );
}
