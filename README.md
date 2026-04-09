# Doorables Merged Paid App

This merges:
- your local Doorables app UI
- profiles
- favorites / want / collection quantities
- marketplace board
- compare mode
- pricing / paywall starter
- Stripe checkout starter
- Supabase schema starter

## What this is
A **merged starter** so your app structure is together in one project.

## What is real already
- local Doorables app UI works
- pricing page exists
- Stripe checkout session route exists
- Stripe webhook scaffold exists
- Supabase schema starter exists

## What is still mock/local
- app access gate is demo logic only
- subscription status is not yet synced from Stripe
- login page is placeholder
- marketplace inside /app is still local browser state
- promo codes are schema only, no redemption UI yet

## Best next steps
1. Run `npm install`
2. Copy `.env.example` to `.env.local`
3. Create Stripe prices
4. Create Supabase project
5. Run `supabase/schema.sql`
6. Wire login and subscription status into `/app/page.tsx`

## Local dev
```bash
npm install
npm run dev
```