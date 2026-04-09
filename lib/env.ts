export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ownerEmail: process.env.OWNER_EMAIL || "",
  stripeMonthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || "",
  stripeYearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID || "",
  autoOwnerBypass: (process.env.AUTO_OWNER_BYPASS || "false").toLowerCase() === "true",
};