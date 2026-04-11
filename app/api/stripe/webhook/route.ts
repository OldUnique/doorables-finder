import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook config." }, { status: 400 });
  }

  const body = await req.text();

  try {
    stripe.webhooks.constructEvent(body, sig, webhookSecret);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Webhook error." }, { status: 400 });
  }
}
