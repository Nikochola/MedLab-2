"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RoleSwitcher() {
    const { user, isWorkbenchMode, setWorkbenchMode } = useAuth();
    const router = useRouter();

    if (user?.primary_role !== "institution") {
        return null;
    }

    const toggleMode = () => {
        const nextMode = !isWorkbenchMode;
        setWorkbenchMode(nextMode);

        if (nextMode) {
            toast.info("Entering Student Workbench Mode", {
                description: "You are now seeing the simulation tools from a student's perspective."
            });
            router.push("/learn");
        } else {
            toast.info("Back to Institution Portal", {
                description: "Viewing admin and class management tools."
            });
            router.push("/institution/courses");
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className={`relative h-9 rounded-full px-4 border-2 transition-all ${isWorkbenchMode
                    ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                }`}
        >
            <div className="flex items-center gap-2 font-black uppercase tracking-tighter text-[10px]">
                {isWorkbenchMode ? (
                    <>
                        <GraduationCap className="h-4 w-4" />
                        Workbench Mode
                    </>
                ) : (
                    <>
                        <LayoutDashboard className="h-4 w-4" />
                        Institution Portal
                    </>
                )}
                <Shuffle className="h-3 w-3 ml-1 opacity-50" />
            </div>
        </Button>
    );
}
