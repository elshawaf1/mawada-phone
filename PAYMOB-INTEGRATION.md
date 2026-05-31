# Paymob Flash (Intention API) Card Payment Integration

## Overview

Integration of Paymob's Intention API for card payments in a React Native (Expo) e-commerce app with Supabase Edge Functions. The app is built with Expo SDK 52, React Native 0.81 with New Architecture enabled, and uses pnpm as the package manager.

---

## Problem & Solution Summary

| Problem | Root Cause | Solution |
|---------|-----------|----------|
| App crashes (closes) when pressing "اتمام العملية" | Paymob SDK's Android layouts use **Data Binding** but the app module had `dataBinding = false` (default) | Enabled `buildFeatures { dataBinding = true }` in `android/app/build.gradle` |
| Edge function `paymob-intent` not called | `supabase.functions.invoke()` from `@supabase/supabase-js@2.106.0` crashes in this RN/New Architecture build | Replaced with direct `fetch()` call |
| Edge function returns 401 Unauthorized | Client used Supabase anon key as Bearer token; edge functions have `verify_jwt = true` by default | Use the user's auth session token (`supabase.auth.getSession()`) instead |
| Edge function logs show no invocations | Same as above — crash before or rejection by functions gateway | Fixed both the fetch mechanism and auth token |
| No Arabic error shown, app just closes | Native crash in Paymob SDK (Java exception) cannot be caught by JS try-catch | Enabled data binding in the app module |

---

## Architecture

```
┌─────────────┐     HTTP POST      ┌──────────────────┐     Paymob Intention API     ┌──────────┐
│  React       │ ────────────────→  │  Supabase Edge    │ ──────────────────────────→  │  Paymob   │
│  Native App  │   (fetch with      │  Function          │    (create intention)        │  Server   │
│  (Expo 52)   │    auth JWT)       │  paymob-intent     │                              │          │
└──────┬───────┘                   └─────────┬──────────┘                              └──────────┘
       │                                      │
       │  Creates order in DB                  │  Returns client_secret
       │  (PENDING status)                     │
       │                                      │
       ▼                                      ▼
┌────────────────┐                  ┌──────────────────┐
│  Paymob       │                  │  Webhook          │
│  SDK/WebView  │                  │  paymob-webhook   │
│  (checkout)   │                  │  (HMAC verified)  │
└──────┬────────┘                  └─────────┬─────────┘
       │                                      │
       │  Payment completed                   │  Updates order.paymentStatus
       │                                      │  (PAID / FAILED)
       ▼                                      ▼
┌────────────────┐                  ┌──────────────────┐
│  OrderConfirm  │  ←─────────────  │  Supabase        │
│  Screen        │  (Realtime)      │  Realtime        │
│  (reactive UI) │                  │  Subscription    │
└────────────────┘                  └──────────────────┘
```

---

## Files Changed

### `apps/mobile/plugins/withPaymob.js` — Expo Config Plugin

- **Problem**: Paymob SDK AAR uses Android Data Binding; needs `dataBinding = true` in the app module.
- **Fix**: Added `buildFeatures { dataBinding = true }` in the `withAppBuildGradle` handler.
- **Key detail**: Runs on every build (not just first run) by decoupling from the dependency-addition check.

### `apps/mobile/screens/PaymentScreen.js` — Card Payment Flow

- **Problem**: `supabase.functions.invoke()` crashes before making the HTTP request.
- **Fix**: Replaced with direct `fetch()` to `{supabaseUrl}/functions/v1/paymob-intent`.
- **Fix**: Uses `supabase.auth.getSession()` to get the user's auth JWT (not the anon key).
- **Fix**: Added `res.ok` check to surface HTTP-level errors (404, 401, etc.).

### `apps/mobile/services/supabase.js` — Supabase Client

- Added `export` to `supabaseUrl` and `supabaseAnonKey` so they can be imported by PaymentScreen for the direct `fetch()` call.

### `supabase/functions/paymob-intent/index.ts` — Edge Function

- **Problem**: `crypto.randomUUID()` not available in some Deno versions used by Supabase Edge Functions.
- **Fix**: `globalThis.crypto?.randomUUID?.()` with fallback using `Date.now()` + `Math.random()`.
- **Fix**: `throw dbErr` → `throw new Error(dbErr.message)` to ensure `.message` always exists.
- **Fix**: Added error handling for `order_items.insert` (logs but doesn't crash).

### `supabase/config.toml` — Edge Function Configuration

- Added `verify_jwt = false` for `paymob-intent` (documentation — actual setting must be configured in the Dashboard).

---

## Key Technical Details

### Android Data Binding

The Paymob SDK (`com.paymob.sdk:Paymob-SDK:1.9.0`) uses Android's Data Binding library for its layout inflation. The SDK module declares `buildFeatures { dataBinding = true }` in its own `build.gradle`, but the **app module must also enable it** for the data binding runtime classes to be available at runtime.

**Without it**: `android.view.InflateException` → native crash → app closes immediately with no JS error.

**Fix location**: `android { buildFeatures { dataBinding = true } }` in `apps/mobile/android/app/build.gradle` (or via the Expo config plugin).

### Edge Function Authentication

Supabase Edge Functions have `verify_jwt = true` by default. The gateway rejects requests that don't have a valid Supabase Auth JWT.

- `supabase.functions.invoke()` automatically sends the user's session JWT.
- When using direct `fetch()`, you must obtain it manually:
  ```javascript
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  ```
- The anon key (`supabaseAnonKey`) is NOT a valid JWT and will be rejected.

### SDK Callback vs Webhook

- **SDK callback** (`setSdkListener`): Used only for UI feedback. Not reliable as a source of truth.
- **Webhook** (`paymob-webhook`): The authoritative source of payment status. HMAC-verified (SHA-512, 19 fields alphabetically concatenated). Updates `orders.paymentStatus` in the database.
- **Supabase Realtime**: `OrderConfirm` screen subscribes to `orders` table changes to reactively update the UI when the webhook flips `paymentStatus`.

### Paymob Intention API Endpoint

- **Production URL**: `https://accept.paymob.com/v1/intention/`
- **Different from**: `https://accept.paymob.com/api/intentions/v1-beta/intentions` (older, incorrect endpoint)
- **Response format** (success):
  ```json
  { "id": "pi_test_xxx", "client_secret": "sec_test_xxx", "intention_order_id": 123456, ... }
  ```

---

## Build Notes / Constraints

| Constraint | Reason |
|------------|--------|
| Use `./gradlew assembleDebug` not `./gradlew clean` | `clean` deletes JNI codegen directories required by New Architecture |
| Deploy edge functions via **Supabase Dashboard** (not CLI) | Supabase CLI crashes with `SIGILL` on i3-2350M CPU |
| Edge functions return `200` even on errors | React Native cannot extract `FunctionsHttpError.context` from non-2xx responses |
| `verify_jwt = false` for `paymob-webhook` | Paymob cannot send Supabase JWT in webhook requests |
| Order created server-side (in edge function) before calling Paymob | Eliminates race condition between SDK callback and webhook |

---

## Testing

### Test Card Credentials

| Card | Result |
|------|--------|
| `5123 4567 8901 2346` | Success (3DS-enabled, use password `0123456789`) |
| `4000 0000 0000 0002` | Failure |

### Test Flow

1. Add items to cart → Go to Cart
2. Choose "Debit / Credit Card" payment method
3. Press "اتمام العملية"
4. Paymob checkout sheet appears (SDK or WebView)
5. Enter test card details → Complete payment
6. OrderConfirm screen shows PENDING → PAID status update via Realtime

---

## Environment Variables

### Client (`apps/mobile/.env`)

```
EXPO_PUBLIC_PAYMOB_PUBLIC_KEY=egy_pk_test_6ZX03hYUQLWzcDRyGtKTshBHREnoz8QI
EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID=0
```

### Server (Supabase Edge Function Secrets)

| Secret | Value |
|--------|-------|
| `PAYMOB_SECRET_KEY` | `ZXlKaGJHY2lPaU...` (full secret key from Paymob Dashboard) |
| `PAYMOB_INTEGRATION_ID` | `5670161` |
| `PAYMOB_HMAC` | HMAC secret from Paymob Dashboard |
