# Adorable Vault (mydoorables.com)

A free, fan-made Disney Doorables collection tracker: checklist by series, wishlist and extras, a collector marketplace, public collector profiles, and optional paid plans.

Live site: https://www.mydoorables.com

## Stack

- Next.js 15 (App Router), React 18, TypeScript
- Supabase (database and auth). The figure catalog lives in the `doorables` table; schema starters are in `supabase/schema.sql` and `marketplace_setup.sql`.
- Stripe for subscriptions (`app/api/checkout`, `app/api/create-checkout-session`, webhooks in `app/api/stripe/webhook` and `app/api/stripe-webhook`)
- Resend for feedback emails (`app/api/send-feedback`)
- Google AdSense (loaded in `app/layout.tsx`, ad units in `app/HomeClient.tsx`, `public/ads.txt`)
- Hosted on Vercel; pushes to `main` deploy to production.

## Project layout

- `app/` routes. Most pages are client components; each public route has a small `layout.tsx` that sets its title, description and canonical URL via `lib/seo.ts`.
- `app/sitemap.ts`, `app/robots.ts` for search engines.
- `components/Nav.tsx` site navigation.
- `lib/supabase.ts` Supabase clients.
- `data/doorables.ts` reference list of figures (not imported by the app; the live catalog is in Supabase).

## Environment variables

Set these in Vercel (or `.env.local` for local dev):

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (required to build) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin and webhook writes |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe checkout and webhooks |
| `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `STRIPE_FOUNDING_PRICE_ID` | Plan prices |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | Checkout redirect URLs |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FEEDBACK_TO_EMAIL` | Feedback emails |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | AdSense publisher ID (`ca-pub-...`) |
| `NEXT_PUBLIC_ADSENSE_HOME_TOP_SLOT`, `NEXT_PUBLIC_ADSENSE_HOME_MIDDLE_SLOT`, `NEXT_PUBLIC_ADSENSE_HOME_BOTTOM_SLOT` | Homepage ad unit IDs |

## Local development

```bash
npm ci
npm run dev     # http://localhost:3000
npm run build   # production build
```
