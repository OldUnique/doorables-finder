
create extension if not exists pgcrypto;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  seller_name text,
  description text,
  price numeric,
  image_url text,
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.marketplace_listings enable row level security;

drop policy if exists "public can view active marketplace listings" on public.marketplace_listings;
create policy "public can view active marketplace listings"
on public.marketplace_listings
for select
using (status = 'active');

drop policy if exists "authenticated users can create marketplace listings" on public.marketplace_listings;
create policy "authenticated users can create marketplace listings"
on public.marketplace_listings
for insert
to authenticated
with check (true);
