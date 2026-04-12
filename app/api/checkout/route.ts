import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    console.log("Checkout request plan:", plan);
    console.log("APP URL exists:", !!appUrl);
    console.log("Monthly price exists:", !!monthlyPriceId);
    console.log("Yearly price exists:", !!yearlyPriceId);

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

    if (plan === "monthly") {
      priceId = monthlyPriceId;
    } else if (plan === "yearly") {
      priceId = yearlyPriceId;
    } else {
      return NextResponse.json(
        { error: `Invalid plan selected: ${plan}` },
        { status: 400 }
      );
    }

    console.log("Selected price ID:", priceId);

    const price = await stripe.prices.retrieve(priceId);
    console.log("Stripe price retrieved:", {
      id: price.id,
      active: price.active,
      type: price.type,
      recurringInterval: price.recurring?.interval ?? null,
      livemode: price.livemode,
    });

    if (!price.active) {
      return NextResponse.json(
        { error: `Stripe price is inactive: ${priceId}` },
        { status: 500 }
      );
    }

    if (price.type !== "recurring") {
      return NextResponse.json(
        {
          error: `Stripe price is not recurring: ${priceId}. Current type: ${price.type}`,
        },
        { status: 500 }
      );
    }

    if (plan === "monthly" && price.recurring?.interval !== "month") {
      return NextResponse.json(
        {
          error: `Monthly plan is using wrong Stripe interval: ${price.recurring?.interval ?? "none"}`,
        },
        { status: 500 }
      );
    }

    if (plan === "yearly" && price.recurring?.interval !== "year") {
      return NextResponse.json(
        {
          error: `Yearly plan is using wrong Stripe interval: ${price.recurring?.interval ?? "none"}`,
        },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/success`,
      cancel_url: `${appUrl}/pricing`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe session created but no checkout URL was returned." },
        { status: 500 }
      );
    }

    console.log("Stripe checkout session created:", session.id);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.raw?.message ||
          "Unable to create Stripe checkout session.",
      },
      { status: 500 }
    );
  }
}