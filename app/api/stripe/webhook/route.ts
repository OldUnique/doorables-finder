import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../../../lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function findUserIdByEmail(email: string) {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("Find user by email error:", error.message);
    return null;
  }

  return data?.id ?? null;
}

async function setSubscriptionActive(userId: string, active: boolean) {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_subscribed: active })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

async function getUserIdFromCustomer(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) return null;

  const metadataUserId = getString(customer.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  const email = getString(customer.email);
  if (email) return await findUserIdByEmail(email);

  return null;
}

async function getUserIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  const metadataUserId = getString(session.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  const email =
    getString(session.customer_details?.email) ||
    getString(session.customer_email);

  if (email) {
    const userId = await findUserIdByEmail(email);
    if (userId) return userId;
  }

  if (typeof session.customer === "string") {
    return await getUserIdFromCustomer(session.customer);
  }

  return null;
}

async function getUserIdFromSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = getString(subscription.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  if (typeof subscription.customer === "string") {
    return await getUserIdFromCustomer(subscription.customer);
  }

  return null;
}

function isActiveStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing" || status === "past_due";
}

async function handleReferral(
  userId: string,
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null
) {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, referral_username_used")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("Referral user lookup error:", userError.message);
    return;
  }

  const referralUsername = String(user?.referral_username_used || "").trim();
  if (!referralUsername) return;

  const { data: referrer, error: referrerError } = await supabaseAdmin
    .from("users")
    .select("id")
    .ilike("username", referralUsername)
    .maybeSingle();

  if (referrerError) {
    console.error("Referrer lookup error:", referrerError.message);
    return;
  }

  if (!referrer?.id) return;
  if (referrer.id === userId) return;

  const { data: existing } = await supabaseAdmin
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", referrer.id)
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabaseAdmin.from("referrals").insert({
      referrer_user_id: referrer.id,
      referred_user_id: userId,
      stripe_customer_id: stripeCustomerId || null,
      stripe_subscription_id: stripeSubscriptionId || null,
      qualified: true,
      rewarded: false,
    });

    if (insertError) {
      console.error("Referral insert error:", insertError.message);
      return;
    }
  }

  const { count, error: countError } = await supabaseAdmin
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_user_id", referrer.id)
    .eq("qualified", true);

  if (countError) {
    console.error("Referral count error:", countError.message);
    return;
  }

  if (!count || count % 10 !== 0) return;

  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("free_months_earned")
    .eq("id", referrer.id)
    .maybeSingle();

  const currentFreeMonths = Number(currentUser?.free_months_earned || 0);

  const { error: rewardError } = await supabaseAdmin
    .from("users")
    .update({ free_months_earned: currentFreeMonths + 1 })
    .eq("id", referrer.id);

  if (rewardError) {
    console.error("Free month reward error:", rewardError.message);
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing config" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe signature error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await getUserIdFromCheckoutSession(session);

        if (userId) {
          await setSubscriptionActive(userId, true);
          await handleReferral(
            userId,
            typeof session.customer === "string" ? session.customer : null,
            typeof session.subscription === "string" ? session.subscription : null
          );
        } else {
          console.error("No user found for checkout session:", session.id);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : "";

        if (customerId) {
          const userId = await getUserIdFromCustomer(customerId);

          if (userId) {
            await setSubscriptionActive(userId, true);
            await handleReferral(
              userId,
              customerId,
              typeof invoice.subscription === "string" ? invoice.subscription : null
            );
          } else {
            console.error("No user found for invoice:", invoice.id);
          }
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription);

        if (userId) {
          await setSubscriptionActive(userId, isActiveStatus(subscription.status));
        } else {
          console.error("No user found for subscription update:", subscription.id);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription);

        if (userId) {
          await setSubscriptionActive(userId, false);
        } else {
          console.error("No user found for subscription delete:", subscription.id);
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}