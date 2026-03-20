import Link from "next/link";
import { buildStudentAppUrl } from "@/app/lib/runtimeUrls";

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 border-b-[4px] border-slate-200 bg-white">
            <div className="mx-auto grid grid-cols-3 w-full max-w-6xl items-center px-6 py-4">
                {/* Logo */}
                <Link href="/" className="text-2xl font-black tracking-tight text-[#0066FF] flex items-center gap-2">
                    MedLab
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden items-center justify-center gap-8 text-[13px] font-bold text-slate-400 tracking-wide md:flex">
                    <Link href="/#students" className="transition-colors hover:text-slate-900 flex items-center gap-1">
                        FOR STUDENTS
                    </Link>
                    <Link href="/institutions" className="transition-colors hover:text-slate-900 flex items-center gap-1">
                        FOR INSTITUTIONS
                    </Link>
                </nav>

                {/* CTA Buttons */}
                <div className="flex items-center justify-end gap-4">
                    <Link
                        href={buildStudentAppUrl("/student/login")}
                        className="hidden rounded-xl border-[3px] border-slate-200 shadow-playful-sm px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:-translate-y-1 hover:shadow-playful hover:bg-slate-50 active:translate-y-[4px] active:shadow-none md:block"
                    >
                        LOG IN
                    </Link>
                    <Link
                        href={buildStudentAppUrl("/student/signup")}
                        className="rounded-xl border-[3px] border-[#0052CC] bg-[#0066FF] shadow-[0_4px_0_0_#0052cc] px-6 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-1 hover:shadow-playful-blue hover:brightness-110 active:translate-y-[4px] active:shadow-none"
                    >
                        GET STARTED
                    </Link>
                </div>
            </div>
        </header>
    );
}
