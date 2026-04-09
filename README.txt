
FILES INCLUDED

1. app/pricing/page.tsx
2. app/marketplace/page.tsx
3. app/sell/page.tsx
4. app/api/create-checkout-session/route.ts
5. marketplace_setup.sql

WHAT TO DO

1. Copy each file into the matching folder in your project.
2. Run marketplace_setup.sql in Supabase SQL Editor.
3. Add STRIPE_SECRET_KEY to your .env.local
4. In Stripe, create an active recurring price with lookup key:
   doorables_monthly
5. Create your coupon / promotion code in Stripe for first month free.
6. Restart:
   cmd /c npm run dev

ROUTES

/pricing
/marketplace
/sell

NOTE

The checkout page is wired to allow promotion codes.
The actual first-month-free coupon is created in Stripe, not inside this code.
