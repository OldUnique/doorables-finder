import Stripe from "stripe";
import { NextResponse } from "next/server";

type PlanKey = "monthly" | "yearly" | "founding";

type CheckoutRequestBody = {
  plan?: PlanKey;
  referralUsername?: string | null;
};

function cleanReferralUsername(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase()
    .slice(0, 40);
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  return new Stripe(secretKey);
}

function getPriceId(plan: PlanKey) {
  if (plan === "monthly") return process.env.STRIPE_MONTHLY_PRICE_ID;
  if (plan === "yearly") return process.env.STRIPE_YEARLY_PRICE_ID;
  return process.env.STRIPE_FOUNDING_PRICE_ID;
}

function cleanAppUrl(value?: string | null) {
  return String(value || "").replace(/\/+$/, "");
}

function getAppUrl(req: Request) {
  const envUrl = cleanAppUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (envUrl) return envUrl;

  const requestUrl = new URL(req.url);
  return requestUrl.origin;
}

function getPlanLabel(plan: PlanKey) {
  if (plan === "monthly") return "Seller Plus Monthly";
  if (plan === "yearly") return "Vault Supporter Yearly";
  return "Founding Collector Bundle";
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = (await req.json()) as CheckoutRequestBody;
    const plan = body.plan;
    const referralUsername = cleanReferralUsername(body.referralUsername);

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

    const appUrl = getAppUrl(req);
    const isFoundingBundle = plan === "founding";

    const metadata = {
      plan,
      plan_label: getPlanLabel(plan),
      referral_username: referralUsername || "",
      includes_keychain: isFoundingBundle ? "true" : "false",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",

      metadata,
      subscription_data: {
        metadata,
      },

      ...(isFoundingBundle
        ? {
            shipping_address_collection: {
              allowed_countries: ["US"],
            },
            phone_number_collection: {
              enabled: true,
            },
            custom_text: {
              shipping_address: {
                message:
                  "Shipping is collected for the limited Adorable Vault keychain included with the Founding Collector Bundle.",
              },
              submit: {
                message:
                  "Your Founding Collector Bundle includes one year of Adorable Vault access plus a limited keychain while supplies last.",
              },
            },
          }
        : {
            custom_text: {
              submit: {
                message:
                  "Your Adorable Vault subscription renews automatically until canceled.",
              },
            },
          }),

      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled&plan=${plan}`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Stripe checkout session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
