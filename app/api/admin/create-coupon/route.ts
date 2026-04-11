import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { code, durationCount } = await req.json();

    if (!code || String(code).trim() === "") {
      return NextResponse.json(
        { error: "Coupon code is required." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("promo_codes").insert({
      code: String(code).trim().toUpperCase(),
      description: "Created from admin starter",
      duration_type: "month",
      duration_count: Number(durationCount || 1),
      active: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error." },
      { status: 500 }
    );
  }
}