# Paymob Integration Architecture

## Overview
Mawada Phone integrates Paymob's React Native SDK for accepting online payments (Cards, Mobile Wallet) alongside Cash on Delivery (COD). The architecture follows Paymob's recommended flow: backend creates payment intention, frontend presents native SDK UI, backend confirms payment via webhook.

---

## Components

### 1. Mobile App (`apps/mobile/`)

| File | Purpose |
|------|---------|
| `screens/PaymentScreen.js` | Checkout screen — delivery type, address, payment method selection, order summary |
| `screens/PaymobPaymentScreen.js` | Paymob SDK integration — initializes SDK, presents payment UI, handles results |
| `screens/ResumePaymentScreen.js` | Resume payment for existing unpaid orders |
| `plugins/withPaymob.js` | Expo config plugin — enables dataBinding, adds local Maven repo, fixes manifest |
| `screens/OrderConfirm.js` | Order confirmation after successful payment |

### 2. Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `paymob-intent` | Creates order in DB, calls Paymob Intention API, returns `clientSecret` to mobile |
| `paymob-webhook` | Receives Paymob callback, verifies HMAC, updates order to PAID/FAILED |

### 3. Database Tables

| Table | Purpose |
|-------|---------|
| `orders` | Order records with `paymentMethod`, `paymentStatus` |
| `order_items` | Individual items in each order |
| `saved_cards` | Tokenized card storage for saved cards feature |
| `payment_idempotency_keys` | Prevents duplicate order creation |

---

## Payment Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Mobile App  │────▶│ paymob-intent │────▶│  Paymob API     │
│  (Payment    │     │ Edge Function │     │  POST /v1/      │
│   Screen)    │     │              │     │  intention/     │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │                     │
       │              Creates order         Returns clientSecret
       │              in Supabase DB              │
       │                    │                     │
       ▼                    │                     ▼
┌─────────────┐              │            ┌─────────────────┐
│ PaymobPayment│◀─────────────┘            │  Paymob SDK     │
│ Screen       │                           │  presentPayVC() │
│ (Native UI)  │◀──────────────────────────│                 │
└─────────────┘                           └─────────────────┘
       │                                           │
       │  PaymentResult.SUCCESS/FAIL/PENDING       │
       │                                           │
       ▼                                           ▼
┌─────────────┐                           ┌─────────────────┐
│OrderConfirm │                           │ paymob-webhook   │
│ Screen      │                           │ Edge Function    │
└─────────────┘                           │ (HMAC verified)  │
                                          │ Updates PAID/    │
                                          │ FAILED in DB     │
                                          └─────────────────┘
```

### Step-by-Step

1. **User selects payment method** on `PaymentScreen` (COD / Card / Wallet)
2. **For COD**: Edge function creates order → navigates to `OrderConfirm` immediately
3. **For Card/Wallet**: Edge function creates order + calls Paymob Intention API → returns `clientSecret`
4. **Mobile navigates to `PaymobPaymentScreen`** with `clientSecret`
5. **Paymob SDK** presents native checkout UI (card input / wallet selection)
6. **User completes payment** inside SDK
7. **SDK fires callback** with `PaymentResult.SUCCESS` / `FAIL` / `PENDING`
8. **Meanwhile**: Paymob sends server-to-server webhook to `paymob-webhook`
9. **Webhook** verifies HMAC signature → updates `orders.paymentStatus` to `PAID` or `FAILED`

---

## Credentials & Configuration

### Edge Function Secrets (set via `supabase secrets set`)
- `PAYMOB_SECRET_KEY` — Paymob API authentication
- `PAYMOB_HMAC` — Webhook HMAC verification (SHA-512)

### Mobile App Environment (`.env`)
- `EXPO_PUBLIC_PAYMOB_PUBLIC_KEY` — SDK initialization
- `EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID` — Card payment integration
- `EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID` — Wallet payment integration

### Paymob Dashboard Configuration
- **Webhook URL**: `https://hwhnskouvcwiufczxhek.supabase.co/functions/v1/paymob-webhook`
- **Redirect URL**: Same as webhook URL

---

## Security

- **Secret key** never exposed to mobile app — only used in edge function
- **Webhook HMAC** verified using SHA-512 — prevents tampered callbacks
- **JWT verification** on `paymob-intent` — only authenticated users can create orders
- **Idempotency keys** prevent duplicate order creation
- **Amount verification** — webhook validates payment amount matches order total
- **PCI compliance** — Paymob SDK handles all card data, merchant never sees raw card numbers

---

## Payment Methods

| Method | Type | Integration ID | Status |
|--------|------|---------------|--------|
| الدفع عند الاستلام (COD) | `COD` | N/A | ✅ Active |
| بطاقة ائتمان (Card) | `VISA` | `5744962` (UIG) | ✅ Active |
| محفظة إلكترونية (Wallet) | `WALLET` | `5744962` (UIG) | ✅ Active |
| valU (BNPL) | `VALU` | — | ⏸️ Disabled |

---

## Native Build Configuration

### `withPaymob.js` Expo Plugin
1. Adds local Maven repo (`node_modules/paymob-reactnative/android/libs`) to project-level `build.gradle`
2. Enables `dataBinding true` in app-level `build.gradle`
3. Adds `tools:replace="android:enableOnBackInvokedCallback"` to `AndroidManifest.xml`

### Required Dependencies
- `paymob-reactnative` — Paymob React Native SDK (npm package from GitHub)
- `com.paymob.sdk:Paymob-SDK:1.9.2` — Native Android SDK (local Maven AAR)

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Edge function fails | Alert with error message, user can retry |
| Paymob API error | Order not created, user informed |
| SDK payment FAIL | Error screen with retry button |
| SDK payment PENDING | Pending status, order confirmed by webhook later |
| Webhook HMAC fails | 401 response, order status unchanged |
| Amount mismatch | 400 response, order status unchanged |
| Duplicate idempotency key | 409 response with existing orderId |

---

## Saved Cards

- Table: `saved_cards` (id, userId, maskedPan, cardToken, cardType, isDefault)
- Card tokens received via Paymob card token callback
- Passed to `Paymob.presentPayVC()` as `savedBankCards` parameter
- RLS: users can only read/insert/update/delete their own cards
