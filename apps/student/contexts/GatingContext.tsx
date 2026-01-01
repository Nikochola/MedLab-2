"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

type Plan = "free" | "pro";

interface GatingContextType {
    plan: Plan;
    status: string;
    usage: Record<string, number>;
    isLoading: boolean;
    hasEntitlement: (entitlement: string) => boolean;
    refresh: () => Promise<void>;
}

const GatingContext = createContext<GatingContextType | undefined>(undefined);

export function GatingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [plan, setPlan] = useState<Plan>("free");
    const [status, setStatus] = useState("inactive");
    const [usage, setUsage] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchSubscription = async () => {
        if (!user) {
            setPlan("free");
            setStatus("inactive");
            setUsage({});
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Fetch sub
            const { data: subData } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (subData) {
                setPlan(subData.plan as Plan);
                setStatus(subData.status);
            } else {
                setPlan("free");
                setStatus("inactive");
            }

            // Fetch usage
            const { data: usageData } = await supabase
                .from("usage_limits")
                .select("*")
                .eq("user_id", user.id);

            if (usageData) {
                const usageMap = usageData.reduce((acc: Record<string, number>, curr: { feature: string; usage_count: number }) => ({
                    ...acc,
                    [curr.feature]: curr.usage_count
                }), {});
                setUsage(usageMap);
            }
        } catch (error) {
            console.error("Error fetching subscription/usage:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [user]);

    const hasEntitlement = (entitlement: string) => {
        if (plan === "pro" && status === "active") return true;

        if (entitlement === "ecg.practice") {
            // Check limit for free (3 per day)
            const currentUsage = usage["ecg_practice"] || 0;
            return currentUsage < 3;
        }

        // ecg.cases is pro only
        if (entitlement === "ecg.cases") return false;

        const freeEntitlements = ["progress.basic"];
        return freeEntitlements.includes(entitlement);
    };

    return (
        <GatingContext.Provider value={{ plan, status, usage, isLoading, hasEntitlement, refresh: fetchSubscription }}>
            {children}
        </GatingContext.Provider>
    );
}

export function useGating() {
    const context = useContext(GatingContext);
    if (context === undefined) {
        throw new Error("useGating must be used within a GatingProvider");
    }
    return context;
}
