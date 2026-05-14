import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanKey = "monthly" | "yearly" | "founding";

let stripeClient: Stripe | null = null;
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanReferralUsername(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase()
    .slice(0, 40);
}

function getStripe() {
  if (stripeClient) return stripeClient;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  stripeClient = new Stripe(stripeSecretKey);
  return stripeClient;
}

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return webhookSecret;
}

function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminClient;
}

function getCustomerId(value: Stripe.Checkout.Session | Stripe.Invoice | Stripe.Subscription) {
  const customer = value.customer;

  if (typeof customer === "string") return customer;
  if (customer && "id" in customer && typeof customer.id === "string") return customer.id;

  return "";
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const invoiceWithPossibleSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | null;
      } | null;
    } | null;
  };

  const directSubscription = invoiceWithPossibleSubscription.subscription;

  if (typeof directSubscription === "string") return directSubscription;
  if (
    directSubscription &&
    typeof directSubscription === "object" &&
    "id" in directSubscription &&
    typeof directSubscription.id === "string"
  ) {
    return directSubscription.id;
  }

  const parentSubscription =
    invoiceWithPossibleSubscription.parent?.subscription_details?.subscription;

  return typeof parentSubscription === "string" ? parentSubscription : null;
}

function isActiveStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing" || status === "past_due";
}

async function findUserIdByEmail(email: string) {
  if (!email) return null;

  const supabaseAdmin = getSupabaseAdmin();

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
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_subscribed: active })
    .eq("id", userId);

  if (error) {
    console.error("Update subscription error:", error.message);
    throw new Error(error.message);
  }
}

async function getUserIdFromCustomer(customerId: string) {
  if (!customerId) return null;

  const stripe = getStripe();
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

  const customerId = getCustomerId(session);
  if (customerId) return await getUserIdFromCustomer(customerId);

  return null;
}

async function getUserIdFromSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = getString(subscription.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  const customerId = getCustomerId(subscription);
  if (customerId) return await getUserIdFromCustomer(customerId);

  return null;
}

async function getUserIdFromInvoice(invoice: Stripe.Invoice) {
  const invoiceWithMetadata = invoice as Stripe.Invoice & {
    subscription_details?: {
      metadata?: Stripe.Metadata | null;
    } | null;
  };

  const invoiceMetadataUserId = getString(invoice.metadata?.user_id);
  if (invoiceMetadataUserId) return invoiceMetadataUserId;

  const subscriptionDetailsUserId = getString(
    invoiceWithMetadata.subscription_details?.metadata?.user_id
  );
  if (subscriptionDetailsUserId) return subscriptionDetailsUserId;

  const customerId = getCustomerId(invoice);
  if (customerId) return await getUserIdFromCustomer(customerId);

  return null;
}

async function rememberReferralUsername(userId: string, referralUsername: string) {
  if (!referralUsername) return;

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("users")
    .update({ referral_username_used: referralUsername })
    .eq("id", userId)
    .is("referral_username_used", null);

  if (error) {
    console.error("Referral username save error:", error.message);
  }
}

async function handleReferral(params: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  referralUsernameFromStripe?: string | null;
}) {
  const supabaseAdmin = getSupabaseAdmin();

  const { userId, stripeCustomerId, stripeSubscriptionId } = params;
  const cleanStripeReferral = cleanReferralUsername(params.referralUsernameFromStripe);

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, referral_username_used")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) {
    console.error("Referral user lookup error:", userError?.message);
    return;
  }

  const referralUsername =
    cleanReferralUsername(user.referral_username_used) || cleanStripeReferral;

  if (!referralUsername) return;

  if (!cleanReferralUsername(user.referral_username_used) && cleanStripeReferral) {
    await rememberReferralUsername(userId, cleanStripeReferral);
  }

  const { data: referrer, error: referrerError } = await supabaseAdmin
    .from("users")
    .select("id, free_months_earned")
    .ilike("username", referralUsername)
    .maybeSingle();

  if (referrerError || !referrer?.id) {
    console.error("Referrer lookup error:", referrerError?.message);
    return;
  }

  if (referrer.id === userId) {
    console.log("Self-referral blocked.");
    return;
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", referrer.id)
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Referral duplicate check error:", existingError.message);
    return;
  }

  if (existing) {
    console.log("Referral already exists. Skipping.");
    return;
  }

  const { error: insertError } = await supabaseAdmin.from("referrals").insert({
    referrer_user_id: referrer.id,
    referred_user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    qualified: true,
    rewarded: false,
  });

  if (insertError) {
    console.error("Referral insert error:", insertError.message);
    return;
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

  const currentFreeMonths = Number(referrer.free_months_earned || 0);

  const { error: rewardError } = await supabaseAdmin
    .from("users")
    .update({ free_months_earned: currentFreeMonths + 1 })
    .eq("id", referrer.id);

  if (rewardError) {
    console.error("Free month reward error:", rewardError.message);
    return;
  }

  await supabaseAdmin
    .from("referrals")
    .update({ rewarded: true })
    .eq("referrer_user_id", referrer.id)
    .eq("qualified", true)
    .eq("rewarded", false);

  console.log("Free month earned for referrer:", referrer.id);
}

function getReferralFromSession(session: Stripe.Checkout.Session) {
  return (
    cleanReferralUsername(session.metadata?.referral_username) ||
    cleanReferralUsername(session.subscription_data?.metadata?.referral_username)
  );
}

function getReferralFromSubscription(subscription: Stripe.Subscription) {
  return cleanReferralUsername(subscription.metadata?.referral_username);
}

function getReferralFromInvoice(invoice: Stripe.Invoice) {
  const invoiceWithMetadata = invoice as Stripe.Invoice & {
    subscription_details?: {
      metadata?: Stripe.Metadata | null;
    } | null;
  };

  return (
    cleanReferralUsername(invoice.metadata?.referral_username) ||
    cleanReferralUsername(
      invoiceWithMetadata.subscription_details?.metadata?.referral_username
    )
  );
}

function getPlanFromSession(session: Stripe.Checkout.Session): PlanKey | "" {
  const plan = getString(session.metadata?.plan);

  if (plan === "monthly" || plan === "yearly" || plan === "founding") return plan;

  return "";
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe webhook signature failed.";

    console.error("Stripe signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await getUserIdFromCheckoutSession(session);

        if (userId) {
          await setSubscriptionActive(userId, true);

          await handleReferral({
            userId,
            stripeCustomerId: getCustomerId(session) || null,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : null,
            referralUsernameFromStripe: getReferralFromSession(session),
          });
        } else {
          console.error("No user found for checkout session:", session.id, {
            plan: getPlanFromSession(session),
            customerEmail: session.customer_details?.email || session.customer_email,
          });
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await getUserIdFromInvoice(invoice);
        const customerId = getCustomerId(invoice);
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);

        if (userId) {
          await setSubscriptionActive(userId, true);

          await handleReferral({
            userId,
            stripeCustomerId: customerId || null,
            stripeSubscriptionId: subscriptionId,
            referralUsernameFromStripe: getReferralFromInvoice(invoice),
          });
        } else {
          console.error("No user found for invoice:", invoice.id);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription);

        if (userId) {
          await setSubscriptionActive(userId, isActiveStatus(subscription.status));

          await handleReferral({
            userId,
            stripeCustomerId: getCustomerId(subscription) || null,
            stripeSubscriptionId: subscription.id,
            referralUsernameFromStripe: getReferralFromSubscription(subscription),
          });
        } else {
          console.error("No user found for subscription event:", subscription.id);
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error.";

    console.error("Webhook handler error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
