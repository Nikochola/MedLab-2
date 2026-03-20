"use client"
import Link from "next/link";
import { buildStudentAppUrl } from "@/app/lib/runtimeUrls";

export function CTA() {
    return (
        <section className="py-24 md:py-32 bg-[#0066FF] text-white relative overflow-hidden flex flex-col items-center justify-center text-center">

            {/* Background decorations */}
            <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-[#00f7ff] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] bg-white rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

            <div className="max-w-3xl mx-auto px-6 relative z-10 flex flex-col items-center">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
                    Ready to Think Like an Attending?
                </h2>
                <p className="text-blue-100 text-lg md:text-xl font-bold mb-10 max-w-xl leading-relaxed">
                    Join thousands of medical students mastering clinical reasoning with interactive AI case simulations.
                </p>

                <Link
                    href={buildStudentAppUrl("/student/signup")}
                    className="w-full max-w-[340px] text-center rounded-[24px] border-[4px] border-slate-200 shadow-playful bg-white px-8 py-5 text-lg font-black tracking-wide text-[#0066FF] transition-all hover:bg-slate-50 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#e2e8f0] active:translate-y-[8px] active:shadow-none"
                >
                    START LEARNING
                </Link>

                <p className="mt-6 text-sm font-bold text-blue-200">
                    No credit card required. Free forever for students.
                </p>
            </div>
        </section>
    );
}
