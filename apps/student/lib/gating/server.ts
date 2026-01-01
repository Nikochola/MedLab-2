import { createSupabaseAdminClient } from "@/lib/supabaseServer";

export type Plan = "free" | "pro";

export async function getSubscription(userId: string) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        return { plan: "free" as Plan, status: "inactive" };
    }

    return data as { plan: Plan; status: string };
}

export async function hasEntitlement(userId: string, entitlement: string): Promise<boolean> {
    const sub = await getSubscription(userId);

    // Pro has everything
    if (sub.plan === "pro" && sub.status === "active") {
        return true;
    }

    // Free entitlements
    const freeEntitlements = [
        "ecg.practice.limited",
        "progress.basic"
    ];

    if (freeEntitlements.includes(entitlement)) {
        return true;
    }

    return false;
}

export async function checkUsageLimit(userId: string, feature: string, limit: number): Promise<{ allowed: boolean; current: number }> {
    const supabase = createSupabaseAdminClient();

    // 1. Get current usage
    const { data, error } = await supabase
        .from("usage_limits")
        .select("*")
        .eq("user_id", userId)
        .eq("feature", feature)
        .single();

    const now = new Date();
    let usage = data;

    // 2. Reset if needed (e.g., daily reset)
    if (usage && isDifferentDay(new Date(usage.last_reset_at), now)) {
        const { data: updatedUsage } = await supabase
            .from("usage_limits")
            .update({ usage_count: 0, last_reset_at: now.toISOString() })
            .eq("user_id", userId)
            .eq("feature", feature)
            .select()
            .single();
        usage = updatedUsage;
    }

    if (!usage) {
        // Initialize
        const { data: newUsage } = await supabase
            .from("usage_limits")
            .insert({ user_id: userId, feature, usage_count: 0, last_reset_at: now.toISOString() })
            .select()
            .single();
        usage = newUsage;
    }

    const currentCount = usage?.usage_count || 0;
    return {
        allowed: currentCount < limit,
        current: currentCount
    };
}

export async function incrementUsage(userId: string, feature: string) {
    const supabase = createSupabaseAdminClient();

    // Using RPC for atomic increment is better, but for now:
    await supabase.rpc('increment_usage', { x_user_id: userId, x_feature: feature });
}

function isDifferentDay(d1: Date, d2: Date) {
    return d1.getFullYear() !== d2.getFullYear() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getDate() !== d2.getDate();
}
