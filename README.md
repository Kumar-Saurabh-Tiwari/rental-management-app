# Nestly

Premium, mobile-first tenant and rental management for **RB Tiwari's Properties**.

Nestly gives landlords one calm workspace for occupancy, tenant profiles, rent collection, electricity readings, meter-photo evidence, and notices.

## UI preview

```text
┌─────────────────────────────────────────────────────────────────────┐
│  nestly   RB Tiwari's Properties                 Live  ☾  RB       │
├───────────────┬─────────────────────────────────────────────────────┤
│  Workspace    │  Good morning, RB Tiwari                 + Add tenant│
│  ▣ Overview   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  ◉ Tenants    │  │24 rooms │ │50% full │ │₹52,000  │ │₹11,280  ││
│  ▦ Rooms      │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│  ₹ Payments   │  Recent tenants                 Upcoming dues       │
│  ⚡ Utilities  │  Aarav Mehta  A-204  ₹19,780    Priya Sharma ₹14,940│
│               │  Rohan Kapoor A-101  ₹17,560    Rohan Kapoor ₹17,560│
│  RB Tiwari    │  Utility snapshot              Notice board         │
└───────────────┴─────────────────────────────────────────────────────┘
```

The app is responsive at mobile widths with bottom navigation, camera-ready meter upload, slide-in profiles, dark mode, hover states, and reduced-motion-friendly transitions.

## Features

- Landlord-only Supabase Auth login
- RB Tiwari landlord profile editor and sign out
- Overview dashboard with occupancy, rent, electricity, and collection metrics
- Working sidebar and mobile tab navigation for Overview, Tenants, Rooms, Payments, and Utilities
- Tenant CRUD starter flow with searchable profiles
- Full tenant profile with lease, contact, ID-proof and vehicle sections
- Monthly electricity billing:
  - Upload or capture a meter image on mobile
  - Enter last and latest readings
  - Calculate consumed units as `latest reading - last reading`
  - Calculate bill as `units consumed × rate per unit`
  - Persist bill and photo to Supabase
- Payment recording with transaction reference
- Dark mode and premium motion design
- Production data is loaded only from Supabase; empty tables show empty states

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment

Create `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never put a Supabase service-role key in the browser app.

## Supabase setup

1. Open the Supabase SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase Authentication → Users, create the landlord account. Use the email/password you want for the landlord; credentials are intentionally not stored in this repository.
4. In Authentication → Providers, enable Google if OAuth login is required.
5. In Authentication → URL Configuration, add `http://localhost:5173` and your deployed app URL to the allowed redirect URLs.
6. Confirm the `meter-images` storage bucket is present.
7. Start the app and sign in.

The login screen supports email sign-in, landlord registration with email confirmation, and Google OAuth. Database API reads/writes require an authenticated Supabase session and are protected by the RLS policies in the schema.

If the browser shows `PGRST205` or says `Could not find the table 'public.rooms'`, the SQL script has not been applied to this Supabase project yet. Run the complete [`supabase/schema.sql`](./supabase/schema.sql) in **Supabase Dashboard → SQL Editor → New query → Run**, then reload the app. No mock records are loaded.

## Validation

```bash
npm test
npm run build
```

## Project structure

```text
src/
  main.jsx             App UI, flows, navigation, login and profiles
  styles.css           Responsive visual system and animations
  supabaseClient.js    Auth, tenant, payment and electricity persistence
supabase/
  schema.sql           Relational tables, indexes, storage bucket and policies
```

## Notes

The tenant portal is intentionally reserved for a future phase. The current authentication surface is landlord/admin only, as requested.
