"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpStudent } from "@/server/actions/auth";
import { User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { buildAuthCallbackUrl } from "@/lib/runtimeUrls";

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8196H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
        </svg>
    );
}

function StudentSignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const nextPath = (() => {
        const next = searchParams.get("next");
        if (!next || !next.startsWith("/") || next.startsWith("//")) return "/learn";
        return next;
    })();

    async function handleGoogleSignUp() {
        setIsGoogleLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: buildAuthCallbackUrl(nextPath),
            },
        });
        if (error) {
            toast.error(error.message);
            setIsGoogleLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const result = await signUpStudent(formData);

        if (result.error) {
            toast.error(result.error);
            setIsLoading(false);
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            toast.error(signInError.message);
            setIsLoading(false);
            return;
        }

        toast.success("Welcome to MedLab! Redirecting...");
        router.push(nextPath);
        router.refresh();
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F8F7F2" }}>
            <div className="w-full max-w-[400px]">
                {/* Logo */}
                <div className="flex justify-center mb-10">
                    <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 22 }} />
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0E0F12" }}>
                        Create your account
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: "#6B6A65" }}>
                        Start your clinical reasoning journey today.
                    </p>
                </div>

                {/* Google */}
                <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full h-12 rounded-[9px] text-sm font-medium flex items-center justify-center gap-3 transition-all disabled:opacity-50 mb-4"
                    style={{
                        backgroundColor: "white",
                        border: "1.5px solid #E8E6DF",
                        color: "#0E0F12",
                    }}
                >
                    {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                    Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px" style={{ backgroundColor: "#E8E6DF" }} />
                    <span className="text-xs font-medium" style={{ color: "#9B9A94" }}>or</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "#E8E6DF" }} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-xs font-medium" style={{ color: "#6B6A65" }}>
                            Full Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9B9A94" }} />
                            <input
                                id="name"
                                name="name"
                                placeholder="Alex Rivera"
                                required
                                className="w-full h-12 pl-11 pr-4 rounded-[9px] text-sm font-medium outline-none transition-colors"
                                style={{
                                    backgroundColor: "white",
                                    border: "1.5px solid #E8E6DF",
                                    color: "#0E0F12",
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#0066FF"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#E8E6DF"}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-xs font-medium" style={{ color: "#6B6A65" }}>
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9B9A94" }} />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="alex@med.edu"
                                required
                                className="w-full h-12 pl-11 pr-4 rounded-[9px] text-sm font-medium outline-none transition-colors"
                                style={{
                                    backgroundColor: "white",
                                    border: "1.5px solid #E8E6DF",
                                    color: "#0E0F12",
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#0066FF"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#E8E6DF"}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="password" className="block text-xs font-medium" style={{ color: "#6B6A65" }}>
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9B9A94" }} />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="w-full h-12 pl-11 pr-4 rounded-[9px] text-sm font-medium outline-none transition-colors"
                                style={{
                                    backgroundColor: "white",
                                    border: "1.5px solid #E8E6DF",
                                    color: "#0E0F12",
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#0066FF"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#E8E6DF"}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-[9px] text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        style={{
                            backgroundColor: "#0066FF",
                            border: "1.5px solid #0047CC",
                            boxShadow: "0 3px 0 #0047CC",
                        }}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-sm" style={{ color: "#6B6A65" }}>
                        Already have an account?{" "}
                        <a href={`/student/login?next=${encodeURIComponent(nextPath)}`} className="font-medium hover:underline" style={{ color: "#0066FF" }}>
                            Log in
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default function StudentSignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#F8F7F2" }} />}>
            <StudentSignupForm />
        </Suspense>
    );
}
