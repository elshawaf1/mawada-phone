# Mawada Phone (موده فون) — Production Readiness Plan

> Comprehensive audit and implementation plan for production launch.
> Last updated: 2026-06-11

---

## Table of Contents

1. [Payment Process Issues](#1-payment-process-issues)
2. [Password Reset / Auth Issues](#2-password-reset--auth-issues)
3. [Compare Products System](#3-compare-products-system)
4. [App Name & Configuration](#4-app-name--configuration)
5. [Orders / My Orders Flow](#5-orders--my-orders-flow)
6. [Database & Code Bugs](#6-database--code-bugs)
7. [Implementation Sprints](#7-implementation-sprints)

---

## 1. Payment Process Issues

### 1.1 — Coupon Discount Shows 0 in Cart (P1)

| | |
|---|---|
| **Files** | `CartScreen.js:107,128,201`, `PaymentScreen.js:156` |
| **Problem** | After the H3 security fix, `coupon` object is `{ code }` only — `coupon.discount` is always `undefined`. All client-side code reading it gets `0`. Users see no discount before checkout |
| **Root Cause** | Server-side coupon validation was added (correct), but the client was never updated to fetch discount info. `applyCoupon()` in `AppContext.js` just stores the code and returns `{ success: true }` unconditionally |
| **Fix** | Create a Supabase RPC or edge function to validate coupon and return discount info. CartScreen fetches it on apply. Show "code applied" message with percentage if valid, error if invalid |

### 1.2 — Invalid Coupon Shows "Applied" (P1)

| | |
|---|---|
| **Files** | `AppContext.js:76`, `CartScreen.js:126-131` |
| **Problem** | `applyCoupon()` always returns `{ success: true }`. No server validation happens when user taps "Apply". They see success → proceed to checkout → edge function rejects |
| **Fix** | Same as 1.1 — validate coupon with a lightweight server call at apply time, not just at checkout |

### 1.3 — No Server-Side Idempotency (P1)

| | |
|---|---|
| **Files** | `supabase/functions/paymob-intent/index.ts` |
| **Problem** | Client sends `idempotencyKey` but server never checks/stores it. Network retry creates duplicate orders and payment intents |
| **Fix** | Store used idempotency keys in a DB table (`payment_idempotency_keys`). Check before creating order. Reject duplicates with 409 |

### 1.4 — ResumePaymentScreen Missing userId Filter (P1)

| | |
|---|---|
| **Files** | `ResumePaymentScreen.js:97` |
| **Problem** | `db.getOrder(orderId)` called without `userId` — authorization filter is skipped. Any user who knows an order ID could view it |
| **Fix** | Change to `db.getOrder(orderId, user?.id)` |

### 1.5 — Unnecessary userId in Edge Body (P3)

| | |
|---|---|
| **Files** | `ResumePaymentScreen.js:210` |
| **Problem** | `userId: user.id` sent in edge body but server gets it from JWT |
| **Fix** | Remove `userId` from edgeBody |

---

## 2. Password Reset / Auth Issues

### 2.1 — No Deep Link Scheme (P1)

| | |
|---|---|
| **Files** | `app.json` |
| **Problem** | No `"scheme": "mawada"` configured. App cannot receive deep links at all |
| **Fix** | Add `"scheme": "mawada"` to expo config in `app.json` |

### 2.2 — No Linking Handler (P1)

| | |
|---|---|
| **Files** | `App.js` |
| **Problem** | No `Linking.addEventListener` for `url` events. When user is redirected back after password reset, the app doesn't detect it |
| **Fix** | Add `Linking` handler in `App.js` that detects `reset-password` paths, extracts tokens, and navigates to `UpdatePassword` |

### 2.3 — No redirectTo for Password Reset Email (P1)

| | |
|---|---|
| **Files** | `ForgotPasswordScreen.js:29` |
| **Problem** | `supabase.auth.resetPasswordForEmail(email)` called without `redirectTo`. Supabase uses default redirect (browser page). User clicks link → browser → never returns to app |
| **Fix** | Add `redirectTo: 'mawada://reset-password'` |

### 2.4 — Login Field Not Validated (P2)

| | |
|---|---|
| **Files** | `LoginScreen.js:30-35` |
| **Problem** | `phoneOrEmail` field accepts any input with no format check |
| **Fix** | Add validation: if input contains `@`, validate as email; otherwise validate as Egyptian phone number |

---

## 3. Compare Products System

### 3.1 — CompareScreen Overview

The compare system is functional but has several issues:

| Feature | Status |
|---------|--------|
| Add products from SearchScreen | ✅ Works |
| Add products from ItemScreen | ✅ Works |
| Side-by-side product cards | ✅ Works |
| Specifications comparison | ✅ Works (fetches from DB) |
| Highlight differences | ✅ Works |
| Max 4 products | ✅ Works |
| Remove individual products | ✅ Works |
| Clear all | ✅ Works |
| Empty state with CTA | ✅ Works |
| Navigate to Search to add | ✅ Works |

### 3.2 — Specifications Not Grouped (P2)

| | |
|---|---|
| **Files** | `CompareScreen.js:52-58` |
| **Problem** | `specifications` table has a `groupName` field (e.g., "Display", "Camera", "Battery") but CompareScreen shows all specs in a flat list. Specs from different groups are mixed together |
| **Fix** | Group specs by `groupName` with section headers (e.g., "الشاشة", "الكاميرا", "البطارية") |

### 3.3 — Inconsistent Data Shape Across Entry Points (P2)

| | |
|---|---|
| **Files** | `AppContext.js:137-143`, `SearchScreen.js`, `ItemScreen.js` |
| **Problem** | `addToCompare` stores whatever product object is passed. SearchScreen loads products with `product_images(id, url, "isPrimary"), brands(name, "nameAr")`. ItemScreen loads with full nested data. CompareScreen expects a specific shape but may get different structures |
| **Fix** | Normalize product data before adding to compare list. Store only needed fields: `id, nameAr, basePrice, salePrice, isOnSale, product_images, brands` |

### 3.4 — Fetching Specs Outside Service Layer (P2)

| | |
|---|---|
| **Files** | `CompareScreen.js:33-37` |
| **Problem** | Specifications are fetched directly via `supabase.from('specifications')` instead of through `api.js`. Inconsistent with the rest of the app |
| **Fix** | Add `db.getProductSpecs(productId)` to `api.js` and use it in CompareScreen |

---

## 4. App Name & Configuration

### 4.1 — app.json Name is "mobile" (P2)

| | |
|---|---|
| **Files** | `app.json:3,4,29` |
| **Problem** | `"name": "mobile"`, `"slug": "mobile"`, Android `"package": "com.anonymous.mobile"` |
| **Fix** | Set to `"name": "موده فون"`, `"slug": "mawada-phone"`, Android `"package": "com.mawada.phone"` |

### 4.2 — Wrong Arabic Name in Translations (P2)

| | |
|---|---|
| **Files** | `translations.js:247` |
| **Problem** | Arabic `appName: 'موعدا فون'` (wrong spelling) |
| **Fix** | Change to `'موده فون'` |

### 4.3 — Paymob App Name (P2)

| | |
|---|---|
| **Files** | `PaymentScreen.js:244`, `ResumePaymentScreen.js:243` |
| **Problem** | `Paymob.setAppName('Mawada')` — shows English name during payment UI |
| **Fix** | Change to `'موده فون'` if desired |

### 4.4 — No Deep Link Scheme (P2)

| | |
|---|---|
| **Files** | `app.json` |
| **Problem** | No `scheme` configured (also blocks password reset flow) |
| **Fix** | Add `"scheme": "mawada"` to expo config |

---

## 5. Orders / My Orders Flow

### 5.1 — OrderScreen.js is Dead Code (P2)

| | |
|---|---|
| **Files** | `screens/OrderScreen.js`, `App.js:57` |
| **Problem** | `OrderScreen.js` is registered as `'Orders'` but **no screen navigates to it**. It has hardcoded mock data, no API calls, and its "Track" button has no `onPress` handler |
| **Fix** | Remove `OrderScreen.js` and its registry entry, or fix it to become functional. The real orders screen is `MyOrdersScreen` |

### 5.2 — No Direct Orders Tab in BottomNav (P2)

| | |
|---|---|
| **Files** | `components/BottomNav.js` |
| **Problem** | Bottom nav has Profile, Search, Home, Cart — no Orders tab. Users must go Profile → My Orders |
| **Fix** | Consider adding an Orders tab or changing the Profile tab to show orders count badge |

### 5.3 — addresses Field May Be Array (P2)

| | |
|---|---|
| **Files** | `OrderDetailScreen.js:195` |
| **Problem** | `order.addresses` from Supabase relationship could be an array. `address.label` would fail if it's `undefined` |
| **Fix** | Use `order.addresses?.[0] || order.addresses || {}` pattern |

### 5.4 — Unused API Function (P3)

| | |
|---|---|
| **Files** | `api.js:123-125` |
| **Problem** | `getMyOrdersWithItems` is an alias for `getOrders` but never called anywhere |
| **Fix** | Remove it |

---

## 6. Database & Code Bugs

### 6.1 — nameEn Column Doesn't Exist (P2)

| | |
|---|---|
| **Files** | `SearchScreen.js:59,146,307` |
| **Problem** | Uses `nameEn` but `categories` table only has `name` and `nameAr`. This will cause a Supabase query error |
| **Fix** | Change `nameEn` to `name` in all three locations |

### 6.2 — Duplicate Utility Functions (P3)

| | |
|---|---|
| **Files** | `MyOrdersScreen.js`, `OrderDetailScreen.js`, `ResumePaymentScreen.js` |
| **Problem** | `formatPrice`, `isPayable`, status color maps duplicated across 3 files |
| **Fix** | Extract to `constants/orders.js` or a shared utils file |

### 6.3 — orderNumber May Be Null (P3)

| | |
|---|---|
| **Files** | Multiple order screens |
| **Problem** | `order.orderNumber` is displayed as title/identifier. If the DB column allows null, shows blank |
| **Fix** | Add fallback: `order.orderNumber || order.id || '—'` |

### 6.4 — Specifications Query Missing Service Layer (P3)

| | |
|---|---|
| **Files** | `CompareScreen.js:33-37` |
| **Problem** | Direct `supabase.from('specifications')` call bypasses `api.js` |
| **Fix** | Add `db.getProductSpecs(productId)` service function |

### 6.5 — Duplicate Splash Timer (P3)

| | |
|---|---|
| **Files** | `SplashScreen.js:25`, `App.js:96-99` |
| **Problem** | Both files have a timer to navigate from Splash → Welcome. App.js sets 2400ms, SplashScreen sets 2200ms |
| **Fix** | Keep only one (preferably in SplashScreen) |

---

## 7. Implementation Sprints

### Sprint 1 — Payment + Password Reset (Critical — Blocking Launch)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | Fix coupon validation — add server-side check on apply, show discount in cart | `api.js`, `CartScreen.js`, `AppContext.js`, new RPC | 4h |
| 1.2 | Add idempotency key tracking to paymob-intent | `paymob-intent/index.ts`, new DB table | 2h |
| 1.3 | Fix ResumePaymentScreen — pass userId to getOrder | `ResumePaymentScreen.js:97` | 15m |
| 1.4 | Add deep link scheme + Linking handler + redirectTo | `app.json`, `App.js`, `ForgotPasswordScreen.js` | 3h |
| 1.5 | Add login field validation | `LoginScreen.js` | 30m |

### Sprint 2 — Compare + Orders + Config (High — Must Fix)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | Group specifications by groupName in CompareScreen | `CompareScreen.js` | 1h |
| 2.2 | Normalize product data before adding to compare | `AppContext.js` (addToCompare) | 30m |
| 2.3 | Add getProductSpecs to api.js service layer | `api.js`, `CompareScreen.js` | 30m |
| 2.4 | Fix `nameEn` → `name` in SearchScreen | `SearchScreen.js:59,146,307` | 15m |
| 2.5 | Remove dead OrderScreen.js | `screens/OrderScreen.js`, `App.js` | 15m |
| 2.6 | Fix addresses array safety | `OrderDetailScreen.js:195` | 15m |
| 2.7 | Update app.json name/slug/package | `app.json` | 15m |
| 2.8 | Fix Arabic name in translations | `translations.js:247` | 5m |
| 2.9 | Update Paymob app name | `PaymentScreen.js`, `ResumePaymentScreen.js` | 5m |

### Sprint 3 — Polish & Cleanup (Medium — Nice to Have)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | Extract shared utils (formatPrice, isPayable, status colors) | New `constants/orders.js`, 3 screens | 1h |
| 3.2 | Remove unused getMyOrdersWithItems | `api.js:123-125` | 5m |
| 3.3 | Remove userId from ResumePaymentScreen edge body | `ResumePaymentScreen.js:210` | 5m |
| 3.4 | Fix duplicate Splash timer | `SplashScreen.js`, `App.js` | 10m |
| 3.5 | Add orderNumber fallback | Multiple screens | 15m |
| 3.6 | Consider My Orders tab in BottomNav | `BottomNav.js` | 1h |

---

## Summary Statistics

| Category | Critical (P1) | High (P2) | Medium (P3) |
|----------|:---:|:---:|:---:|
| Payment Process | 4 | 0 | 1 |
| Password Reset / Auth | 3 | 1 | 0 |
| Compare Products | 0 | 3 | 1 |
| App Name & Config | 0 | 4 | 0 |
| Orders / My Orders | 0 | 3 | 1 |
| Database & Code Bugs | 0 | 1 | 4 |
| **Total** | **7** | **12** | **7** |
|
