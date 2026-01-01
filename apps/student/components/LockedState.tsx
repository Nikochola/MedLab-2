"use client";

import React from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface LockedStateProps {
    title: string;
    description: string;
}

export function LockedState({ title, description }: LockedStateProps) {
    const { user } = useAuth();

    const handleUpgrade = async () => {
        if (!user) {
            window.open("https://polar.sh/nikochola", "_blank");
            return;
        }

        try {
            const response = await fetch("/api/polar/checkout", { method: "POST" });
            if (!response.ok) {
                throw new Error("Failed to start checkout");
            }
            const data = await response.json();
            if (data?.url) {
                window.location.assign(data.url);
                return;
            }
        } catch (error) {
            console.error("Polar checkout error:", error);
        }

        window.open("https://polar.sh/nikochola", "_blank");
    };

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
                {description}
            </p>
            <Button
                size="lg"
                className="rounded-full px-8"
                onClick={handleUpgrade}
            >
                Upgrade to Pro
            </Button>
        </div>
    );
}
