# Mawada Phone — Development Rules

## Build & Release (Play Console)

### Package Info
- **Package name:** `com.elshawaf.mawada`
- **Keystore:** `apps/mobile/android/app/mawada-release.keystore`
- **Key alias:** `mawada`
- **Store password:** `mawada123`
- **Key password:** `mawada123`

### How to Release an Update
1. Update `apps/mobile/app.json`: `"version": "X.Y.Z"`
2. Update `apps/mobile/android/app/build.gradle`:
   - `versionCode` → increment by 1 (1, 2, 3...)
   - `versionName "X.Y.Z"`
3. Build AAB:
   ```bash
   cd ~/mawada-phone/apps/mobile/android && ./gradlew clean bundleRelease
   ```
4. Output: `android/app/build/outputs/bundle/release/app-release.aab`
5. Upload to Google Play Console

### Rules
- `versionCode` MUST increase with every release (integer, never repeat)
- `versionName` is what users see (1.0.0, 1.0.1, 1.1.0...)
- Same keystore (`mawada-release.keystore`) is used every time — NEVER lose it
- Same package name `com.elshawaf.mawada` stays forever
- Never commit `mawada-release.keystore` to git (gitignored)

---

## Project Structure

- **Mobile app:** `apps/mobile/` (React Native / Expo SDK 54)
- **Admin panel:** `apps/admin/mawada-admin/` (Shadcn/ui + Tailwind)
- **Edge functions:** `supabase/functions/`
- **Mobile submodule:** `https://github.com/elshawaf1/mawada-phone-mobile`
- **Parent repo:** `https://github.com/elshawaf1/mawada-phone`

---

## Key Conventions

### RTL (Arabic-first)
- `useDirection()` hook provides `row`, `rowReverse`, `textAlign`
- Only use inside component functions, NOT in `StyleSheet.create()`
- In `StyleSheet.create()`, use hardcoded `'right'`/`'row-reverse'`

### Supabase
- **URL:** `https://hwhnskouvcwiufczxhek.supabase.co`
- **Anon key:** stored in `apps/mobile/.env`
- **Admin panel:** `https://mawada-admin-chi.vercel.app`
- **Management API token:** stored locally (see `.env`)

### Paymob (Test Mode)
- **Public key:** see `apps/mobile/.env` — `EXPO_PUBLIC_PAYMOB_PUBLIC_KEY`
- **Secret key:** stored in Supabase secrets — `PAYMOB_SECRET_KEY`
- **HMAC:** stored in Supabase secrets — `PAYMOB_HMAC`
- **Card integration ID:** see `apps/mobile/.env` — `EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID`
- **Wallet integration ID:** see `apps/mobile/.env` — `EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID`
- Secrets set via: `npx supabase secrets set ... --project-ref hwhnskouvcwiufczxhek`

### Brevo SMTP (Email)
- **Server:** `smtp-relay.brevo.com:587`
- **Login:** see Supabase secrets — `BREVO_SMTP_USER`
- **Key:** see Supabase secrets — `BREVO_SMTP_PASS`
- **Sender:** `Mawada Phone <elshawafa26@gmail.com>`

---

## Common Commands

```bash
# Deploy edge functions
npx supabase functions deploy paymob-intent --project-ref hwhnskouvcwiufczxhek
npx supabase functions deploy paymob-verify --project-ref hwhnskouvcwiufczxhek
npx supabase functions deploy paymob-webhook --project-ref hwhnskouvcwiufczxhek
npx supabase functions deploy send-auth-email --project-ref hwhnskouvcwiufczxhek
npx supabase functions deploy send-order-email --project-ref hwhnskouvcwiufczxhek
npx supabase functions deploy notification-broadcast --project-ref hwhnskouvcwiufczxhek

# Set Supabase secrets
npx supabase secrets set KEY=VALUE --project-ref hwhnskouvcwiufczxhek

# Build release AAB
cd ~/mawada-phone/apps/mobile/android && ./gradlew clean bundleRelease

# Run app locally
cd ~/mawada-phone/apps/mobile && npx expo run:android

# Deploy admin panel
cd ~/mawada-phone/apps/admin/mawada-admin && npx vercel --prod --yes
```

---

## Auth System
- OTP verification required for all signups (`mailer_autoconfirm=false`)
- `handle_new_user()` trigger is DROPPED — profiles created by `AuthContext.createProfile()` after OTP
- `onAuthStateChange` has guards: `authInProgress` ref, `lastFetchedUserId` cache, `sessionChecked` ref
- SplashScreen waits for `loading=false` before navigating (3s safety timeout)

---

## Payment Flow
1. CartScreen → PaymentScreen → `paymob-intent` edge function (creates order + Paymob intention)
2. `Paymob.presentPayVC()` opens native SDK
3. SDK callback → `paymob-verify` (queries Paymob API, updates DB)
4. Polling + AppState fallback + Realtime subscription → OrderConfirm

### 4 Payment Detection Paths
1. SDK callback → verifyWithServer
2. Polling → verifyWithServer every 6s
3. AppState → verify on resume (3s debounce)
4. Realtime subscription on orders table
