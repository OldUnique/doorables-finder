import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase";

const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const recentHits = new Map<string, number[]>();

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 80);
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const kept = (recentHits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (kept.length >= MAX_REQUESTS) {
    recentHits.set(ip, kept);
    return true;
  }
  kept.push(now);
  recentHits.set(ip, kept);
  return false;
}

function isLikelyEmail(value: string) {
  if (!value || value.length > 254) return false;
  return EMAIL_RE.test(value);
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const honey = String(body?.honey ?? "").trim();
    if (honey) {
      return NextResponse.json({ ok: true });
    }

    const email = String(body?.email ?? "").trim().toLowerCase();
    const source = String(body?.source ?? "unknown").trim().slice(0, 80) || "unknown";

    if (!isLikelyEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    const { data: existing, error: lookupError } = await admin
      .from("newsletter_subscribers")
      .select("id, unsubscribed_at")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: "Could not save your email just now. Please try again in a moment." },
        { status: 500 }
      );
    }

    if (existing) {
      if (existing.unsubscribed_at) {
        const { error: updateError } = await admin
          .from("newsletter_subscribers")
          .update({ unsubscribed_at: null, source })
          .eq("id", existing.id);

        if (updateError) {
          return NextResponse.json(
            { error: "Could not save your email just now. Please try again in a moment." },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    const { error: insertError } = await admin
      .from("newsletter_subscribers")
      .insert({ email, source });

    // A unique-conflict race is treated as success so duplicates stay quiet.
    if (insertError && insertError.code !== "23505") {
      return NextResponse.json(
        { error: "Could not save your email just now. Please try again in a moment." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not save your email just now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
