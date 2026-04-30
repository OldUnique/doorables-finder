import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type PlanKey = "monthly" | "yearly" | "founding";

function getPriceId(plan: PlanKey) {
  if (plan === "monthly") return process.env.STRIPE_MONTHLY_PRICE_ID;
  if (plan === "yearly") return process.env.STRIPE_YEARLY_PRICE_ID;
  return process.env.STRIPE_FOUNDING_PRICE_ID;
}

function cleanAppUrl(value: string) {
  return value.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan?: PlanKey };

    if (plan !== "monthly" && plan !== "yearly" && plan !== "founding") {
      return NextResponse.json(
        { error: "Invalid plan selected." },
        { status: 400 }
      );
    }

    const priceId = getPriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for ${plan} plan.` },
        { status: 500 }
      );
    }

    const appUrl = cleanAppUrl(process.env.NEXT_PUBLIC_APP_URL!);
    const isFoundingBundle = plan === "founding";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,

      metadata: {
        plan,
        includes_keychain: isFoundingBundle ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          plan,
          includes_keychain: isFoundingBundle ? "true" : "false",
        },
      },

      ...(isFoundingBundle
        ? {
            shipping_address_collection: {
              allowed_countries: ["US"],
            },
          }
        : {}),

      success_url: `${appUrl}/success?plan=${plan}`,
      cancel_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Unable to create Stripe checkout session." },
      { status: 500 }
    );
  }
}
