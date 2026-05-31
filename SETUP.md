# Mawada Phone - Setup Instructions

## Step 1: Drop Everything
Go to https://supabase.com/dashboard/project/hwhnskouvcwiufczxhek/sql
Paste `supabase/1-drop-all.sql` → **Run**

## Step 2: Create Fresh Schema
Paste `supabase/2-create-schema.sql` → **Run**

## Step 3: Seed Data
Paste `supabase/3-seed-data.sql` → **Run**

## Step 4: Fix Auth (IMPORTANT - fixes infinite recursion)
Paste `supabase/4-fix-auth-trigger.sql` → **Run**

This fixes the RLS policy recursion that blocks registration and login.

## Step 5: Deploy Edge Function
Go to https://supabase.com/dashboard/project/hwhnskouvcwiufczxhek/functions
New Function → name: `notification-broadcast`
Paste `supabase/functions/notification-broadcast/index.ts` → **Deploy**

## Step 6: Disable Email Confirmation
Go to https://supabase.com/dashboard/project/hwhnskouvcwiufczxhek/auth/providers/email
- Toggle OFF "Confirm email"
- Save

## Step 7: Test Admin
```bash
cd apps/admin/mawada-admin && pnpm dev
```
Open http://localhost:3000 (no login required)

## Step 8: Test Mobile (Expo Go)
```bash
cd apps/mobile && npx expo start
```
Scan QR code with Expo Go app on your phone.

### Mobile Auth Storage (Option B)
- Uses SecureStore with split storage (only refresh token persisted)
- No Android Studio or native build required
- Works directly in Expo Go
- Session persists across app restarts via refresh token
