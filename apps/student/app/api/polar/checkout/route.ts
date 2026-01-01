import { NextResponse } from "next/server";
import { polar } from "@/lib/polar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
    const productId = process.env.POLAR_PRO_PRODUCT_ID;
    if (!productId) {
        return NextResponse.json(
            { error: "POLAR_PRO_PRODUCT_ID is not set" },
            { status: 500 }
        );
    }

    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const customerName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        undefined;

    try {
        const checkout = await polar.checkouts.create({
            products: [productId],
            metadata: { user_id: user.id },
            customerMetadata: { user_id: user.id },
            externalCustomerId: user.id,
            customerEmail: user.email ?? undefined,
            customerName,
            successUrl: `${origin}/?checkout=success`,
            returnUrl: `${origin}/?checkout=cancel`,
        });

        return NextResponse.json({ url: checkout.url });
    } catch (error) {
        console.error("Failed to create Polar checkout:", error);
        return NextResponse.json({ error: "Checkout creation failed" }, { status: 500 });
    }
}
