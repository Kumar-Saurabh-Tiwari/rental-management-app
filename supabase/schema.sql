create extension if not exists "uuid-ossp";

create table if not exists rooms (
  id uuid primary key default uuid_generate_v4(),
  room_number text not null unique,
  type text not null check (type in ('Single', 'Double', 'Deluxe')),
  rent_amount numeric(12,2) not null default 0,
  status text not null default 'Vacant' check (status in ('Occupied', 'Vacant', 'Maintenance')),
  created_at timestamptz not null default now()
);

create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete set null,
  name text not null,
  phone text,
  email text,
  payment_model text not null default 'Postpaid' check (payment_model in ('Prepaid', 'Postpaid')),
  emergency_contact text,
  move_in_date date,
  created_at timestamptz not null default now()
);

create table if not exists tenant_documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  doc_type text not null check (doc_type in ('Aadhaar', 'PAN', 'Passport', 'Driver License')),
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vehicle_number text not null,
  vehicle_type text not null check (vehicle_type in ('Car', 'Bike', 'Other')),
  created_at timestamptz not null default now()
);

create table if not exists electricity_bills (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  month_year date not null,
  previous_reading numeric(12,2) not null default 0,
  current_reading numeric(12,2) not null default 0,
  rate_per_unit numeric(10,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  meter_image_url text,
  status text not null default 'Unpaid' check (status in ('Paid', 'Unpaid', 'Delayed')),
  unique (tenant_id, month_year)
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date timestamptz not null default now(),
  payment_type text not null default 'Rent' check (payment_type in ('Rent', 'Electricity', 'Combined')),
  notes text,
  transaction_reference text
);

create index if not exists electricity_bills_tenant_month_idx on electricity_bills(tenant_id, month_year);
create index if not exists payments_tenant_date_idx on payments(tenant_id, payment_date desc);

-- Meter photos are uploaded by the web app to this public bucket.
insert into storage.buckets (id, name, public)
values ('meter-images', 'meter-images', true)
on conflict (id) do update set public = true;

drop policy if exists "meter images are publicly readable" on storage.objects;
create policy "meter images are publicly readable"
on storage.objects for select
using (bucket_id = 'meter-images');

drop policy if exists "authenticated users can upload meter images" on storage.objects;
drop policy if exists "app users can upload meter images" on storage.objects;
create policy "app users can upload meter images"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'meter-images');
