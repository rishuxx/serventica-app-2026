-- ==============================================================================
-- SERVENTICA — Migration: Service Origins & Routing Infrastructure (SERV-02)
-- ==============================================================================

-- 1. Enable PostGIS extension if not already present
create extension if not exists postgis schema extensions;

-- 2. Create service_origins table
create table if not exists public.service_origins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin_type text not null default 'STORE'
    check (origin_type in ('STORE', 'PARTNER', 'PROVIDER', 'HUB', 'WAREHOUSE')),
  address text,
  city text,
  state text,
  pincode text,
  latitude double precision not null,
  longitude double precision not null,
  is_active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create indexes for high-performance active origin lookup & spatial queries
create index if not exists idx_service_origins_active_priority 
  on public.service_origins (is_active, priority desc);

create index if not exists idx_service_origins_city 
  on public.service_origins (city) 
  where is_active = true;

-- 4. Enable Row Level Security (RLS)
alter table public.service_origins enable row level security;

-- Allow public read access to active service origins
create policy "Allow public read access to active origins"
  on public.service_origins
  for select
  using (is_active = true);

-- Allow authenticated service role full access
create policy "Allow service role full access to origins"
  on public.service_origins
  for all
  to service_role
  using (true)
  with check (true);

-- 5. Seed initial Dehradun Pilot Hub / Store Origin
insert into public.service_origins (
  name,
  origin_type,
  address,
  city,
  state,
  pincode,
  latitude,
  longitude,
  is_active,
  priority
) values (
  'Kolhupani – Nanda Ki Chowki – Palwali – Majhun Rd',
  'HUB',
  'Nanda Ki Chowki, Dehradun, Uttarakhand 248007',
  'Dehradun',
  'Uttarakhand',
  '248007',
  30.343866,
  77.953231,
  true,
  100
) on conflict do nothing;
