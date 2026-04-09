create extension if not exists "pgcrypto";

create table if not exists public.doorables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  series text,
  subcategory text,
  rarity text,
  movie text,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists public.user_doorables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  doorable_id uuid not null references public.doorables(id) on delete cascade,
  wanted boolean not null default false,
  favorited boolean not null default false,
  qty_owned integer not null default 0,
  custom_tag text not null default '',
  created_at timestamptz default now(),
  unique(user_id, doorable_id)
);

create index if not exists idx_user_doorables_user_id on public.user_doorables(user_id);
create index if not exists idx_user_doorables_doorable_id on public.user_doorables(doorable_id);

alter table public.user_doorables
add column if not exists qty_owned integer not null default 0;

alter table public.user_doorables
add column if not exists custom_tag text not null default '';