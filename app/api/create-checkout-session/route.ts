import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const { priceLookupKey } = await req.json();

  const prices = await stripe.prices.list({
    lookup_keys: [priceLookupKey],
    expand: ["data.product"],
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: prices.data[0].id,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/pricing",
  });

  return NextResponse.json({ url: session.url });
}