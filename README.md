# Mawada Phone (موادة فون)

Full-stack e-commerce application for a mobile phone store. Includes a customer mobile app (React Native / Expo), an admin dashboard (React / Vite), and a Supabase backend with PostgreSQL, authentication, and edge functions.

## Architecture

| Layer | Technology |
|---|---|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Mobile App** | Expo SDK 54, React Native 0.81, React 19 |
| **Admin App** | React 19, Vite 6, Tailwind CSS v4, shadcn/ui |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions) |
| **Payments** | Paymob Intention API (card + wallet + COD) |
| **Push Notifications** | Expo Push API |

## Directory Structure

```
├── apps/
│   ├── mobile/                  # React Native customer app (Expo)
│   └── admin/mawada-admin/      # React admin dashboard (Vite)
├── supabase/
│   ├── functions/               # Edge Functions (Deno/TypeScript)
│   │   ├── paymob-intent/       # Create orders + Paymob payment intents
│   │   ├── paymob-webhook/      # Paymob payment status callbacks
│   │   └── notification-broadcast/ # Admin push notification broadcasts
│   ├── 20-consolidated-rls.sql  # Authoritative RLS migration
│   ├── 2-create-schema.sql      # Database schema
│   └── migrations/              # Supabase migration history
├── packages/                    # Shared config packages
├── SETUP.md                     # Step-by-step setup guide
└── PAYMOB-INTEGRATION.md        # Payment architecture documentation
```

## Prerequisites

- Node.js 18+
- pnpm 9
- Supabase project
- Paymob merchant account
- Expo CLI

## Quick Start

```sh
pnpm install
pnpm dev
```

### Environment Variables

**Admin app** (`apps/admin/mawada-admin/.env.local`):
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Mobile app** (`apps/mobile/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_PAYMOB_PUBLIC_KEY=your-paymob-key
EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID=your-card-id
EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID=your-wallet-id
```

### Database Setup

See `SETUP.md` for detailed instructions. Apply migrations in order from `supabase/` directory, with `20-consolidated-rls.sql` as the final authoritative RLS policy file.

### Edge Functions

Deploy edge functions to Supabase:

```sh
supabase functions deploy paymob-intent
supabase functions deploy paymob-webhook
supabase functions deploy notification-broadcast
```

Required secrets (set via `supabase secrets set`):
- `PAYMOB_SECRET_KEY`
- `PAYMOB_HMAC`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_ACCESS_TOKEN` (for push notifications)

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm check-types` | Type-check all packages |

## Security

All CRITICAL, HIGH, and MEDIUM security findings have been resolved. See `SECURITY-CRITICAL.md` for the full security audit.

### Key Security Measures

- Server-side price verification (Paymob intent recalculates from DB)
- JWT authentication on all edge functions
- Admin role checks on privileged operations
- RLS policies consolidated and restricted to user-scoped access
- JWT tokens stored in encrypted SecureStore (not AsyncStorage)
- SQL wildcard injection prevented in search queries
- Input validation on all auth forms (email, phone, password complexity)
