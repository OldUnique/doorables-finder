import { NextResponse } from "next/server";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isLikelyEmail(value: string) {
  if (!value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const honey = String(body?.honey ?? "").trim();
    if (honey) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body?.name ?? "Anonymous collector").trim();
    const replyEmail = String(body?.replyEmail ?? "").trim();
    const type = String(body?.type ?? "Feedback").trim();
    const subject = String(body?.subject ?? `${type} feedback`).trim();
    const message = String(body?.message ?? "").trim();
    const pageUrl = String(body?.pageUrl ?? "").trim();

    if (!message || message.length < 8) {
      return NextResponse.json(
        { error: "Please add a little more detail before sending." },
        { status: 400 }
      );
    }

    if (replyEmail && !isLikelyEmail(replyEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid reply email or leave it blank." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.FEEDBACK_TO_EMAIL;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "Adorable Vault <onboarding@resend.dev>";

    if (!resendApiKey || !toEmail) {
      return NextResponse.json(
        {
          error:
            "Feedback email is not configured yet. Add RESEND_API_KEY and FEEDBACK_TO_EMAIL in Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    const safeSubject = `[Adorable Vault Feedback] ${subject || type}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <h2 style="color:#312e81;margin-bottom:8px;">Adorable Vault Feedback 💜</h2>

        <p><strong>Type:</strong> ${escapeHtml(type)}</p>
        <p><strong>From:</strong> ${escapeHtml(name)}</p>
        <p><strong>Reply email:</strong> ${replyEmail ? escapeHtml(replyEmail) : "Not provided"}</p>
        <p><strong>Page:</strong> ${pageUrl ? escapeHtml(pageUrl) : "Not provided"}</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;" />

        <p><strong>Message:</strong></p>
        <div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;">
          ${escapeHtml(message)}
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: safeSubject,
        html,
        reply_to: replyEmail || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Email service could not send the feedback." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not send feedback.",
      },
      { status: 500 }
    );
  }
}
