"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

const GATING_CACHE_KEY = "medlab_gating";
const GATING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface GatingCache {
    userId: string;
    plan: Plan;
    status: string;
    usage: Record<string, number>;
    timestamp: number;
}

function readGatingCache(userId: string): GatingCache | null {
    try {
        const cached = sessionStorage.getItem(GATING_CACHE_KEY);
        if (!cached) return null;
        const data: GatingCache = JSON.parse(cached);
        if (data.userId !== userId) return null;
        if (Date.now() - data.timestamp > GATING_CACHE_TTL_MS) return null;
        return data;
    } catch {
        return null;
    }
}

function writeGatingCache(userId: string, plan: Plan, status: string, usage: Record<string, number>) {
    try {
        const data: GatingCache = { userId, plan, status, usage, timestamp: Date.now() };
        sessionStorage.setItem(GATING_CACHE_KEY, JSON.stringify(data));
    } catch {}
}

function clearGatingCache() {
    try {
        sessionStorage.removeItem(GATING_CACHE_KEY);
    } catch {}
}

export function GatingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [plan, setPlan] = useState<Plan>("free");
    const [status, setStatus] = useState("inactive");
    const [usage, setUsage] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Depend on user?.id (not the full user object) so background auth refreshes
    // that recreate the user object don't trigger a cascade re-fetch.
    const userId = user?.id;

    const fetchSubscription = useCallback(async (showLoading = true) => {
        if (!userId) {
            setPlan("free");
            setStatus("inactive");
            setUsage({});
            clearGatingCache();
            setIsLoading(false);
            return;
        }

        if (showLoading) setIsLoading(true);

        try {
            const { data: subData, error: subError } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (subError) {
                throw subError;
            }

            const newPlan: Plan = subData ? (subData.plan as Plan) : "free";
            const newStatus: string = subData ? subData.status : "inactive";

            setPlan(newPlan);
            setStatus(newStatus);

            const { data: usageData, error: usageError } = await supabase
                .from("usage_limits")
                .select("*")
                .eq("user_id", userId);

            if (usageError) {
                throw usageError;
            }

            const newUsage = usageData
                ? usageData.reduce((acc: Record<string, number>, curr: { feature: string; usage_count: number }) => ({
                    ...acc,
                    [curr.feature]: curr.usage_count
                }), {})
                : {};

            setUsage(newUsage);
            writeGatingCache(userId, newPlan, newStatus, newUsage);
        } catch (error) {
            console.error("Error fetching subscription/usage:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setPlan("free");
            setStatus("inactive");
            setUsage({});
            setIsLoading(false);
            return;
        }

        // Hydrate from cache immediately — avoids loading flash on return visits
        const cached = readGatingCache(userId);
        if (cached) {
            setPlan(cached.plan);
            setStatus(cached.status);
            setUsage(cached.usage);
            setIsLoading(false);
            // Revalidate silently in the background
            fetchSubscription(false);
        } else {
            fetchSubscription(true);
        }
    }, [userId, fetchSubscription]);

    const hasEntitlement = (entitlement: string) => {
        if (plan === "pro" && (status === "active" || status === "trialing")) return true;

        if (entitlement === "ecg.practice") {
            const currentUsage = usage["ecg_practice"] || 0;
            return currentUsage < 3;
        }

        if (entitlement === "xray.practice") {
            const currentUsage = usage["xray_practice"] || 0;
            return currentUsage < 3;
        }

        if (entitlement === "ecg.cases") return false;
        if (entitlement === "xray.cases") return false;

        const freeEntitlements = ["progress.basic"];
        return freeEntitlements.includes(entitlement);
    };

    return (
        <GatingContext.Provider value={{ plan, status, usage, isLoading, hasEntitlement, refresh: () => fetchSubscription(true) }}>
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
