import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    if (!appUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL" },
        { status: 500 }
      );
    }

    if (!monthlyPriceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_MONTHLY_PRICE_ID" },
        { status: 500 }
      );
    }

    if (!yearlyPriceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_YEARLY_PRICE_ID" },
        { status: 500 }
      );
    }

    let priceId: string;

    if (plan === "yearly") {
      priceId = yearlyPriceId;
    } else if (plan === "monthly") {
      priceId = monthlyPriceId;
    } else {
      return NextResponse.json(
        { error: "Invalid plan selected." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/success`,
      cancel_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to create Stripe checkout session." },
      { status: 500 }
    );
  }
}
