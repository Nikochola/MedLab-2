"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateInviteToken, acceptStudentInvite } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Lock, User, Mail, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

function StudentInviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(true);
    const [invite, setInvite] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);

    useEffect(() => {
        async function verify() {
            if (!token) {
                setError("Missing invitation token.");
                setIsLoading(false);
                return;
            }

            const result = await validateInviteToken(token);
            if (result.error) {
                setError(result.error);
            } else {
                setInvite(result.invite);
            }
            setIsLoading(false);
        }
        verify();
    }, [token]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!token) return;

        setIsAccepting(true);
        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;

        const result = await acceptStudentInvite(token, password);

        if ("error" in result && result.error) {
            toast.error(result.error);
            setIsAccepting(false);
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: invite.email,
            password,
        });

        if (signInError) {
            toast.error(signInError.message);
            setIsAccepting(false);
            return;
        }

        toast.success("Account activated! Welcome to MedLab.");
        router.push("/learn");
        router.refresh();
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
                <Card className="max-w-md w-full p-8 border-2 border-red-100 rounded-3xl text-center shadow-xl">
                    <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-[#232a39] mb-4">Link Invalid</h1>
                    <p className="text-sm font-bold text-[#6f7c8f] mb-8">{error}</p>
                    <Button onClick={() => router.push("/student/login")} className="w-full bg-[#232a39] hover:bg-black text-white h-12 rounded-xl">
                        Go to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 border-2 border-[#e5e5e5] rounded-3xl shadow-xl">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-black text-[#232a39] mb-2">Join {invite?.institutions?.name}</h1>
                    <p className="text-sm font-semibold text-[#6f7c8f]">
                        Complete your profile to access your clinical cohort.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#afafaf]" />
                            <Input disabled value={invite?.full_name} className="pl-12 h-14 rounded-xl border-2 border-[#f7f9fc] bg-[#f7f9fc] font-bold text-[#232a39]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#afafaf]" />
                            <Input disabled value={invite?.email} className="pl-12 h-14 rounded-xl border-2 border-[#f7f9fc] bg-[#f7f9fc] font-bold text-[#232a39]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Set Your Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#afafaf]" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="pl-12 h-14 rounded-xl border-2 border-[#e5e5e5] focus:border-blue-500 transition-all font-bold"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isAccepting}
                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-200"
                    >
                        {isAccepting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Activate Account"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}

export default function StudentInvitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
        }>
            <StudentInviteContent />
        </Suspense>
    );
}
