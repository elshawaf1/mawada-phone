# Mawada Phone — Production Setup Guide

> Step-by-step guide to build, deploy, and publish Mawada Phone to Google Play Store.
> Last updated: 2026-06-14

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Fix system_settings Permission Error](#2-fix-system_settings-permission-error)
3. [Supabase Backend Setup](#3-supabase-backend-setup)
4. [Paymob Production Keys](#4-paymob-production-keys)
5. [App Configuration](#5-app-configuration)
6. [Replace App Assets](#6-replace-app-assets)
7. [Build the App](#7-build-the-app)
8. [Google Play Console Setup](#8-google-play-console-setup)
9. [Submit to Play Store](#9-submit-to-play-store)
10. [Post-Launch Checklist](#10-post-launch-checklist)

---

## 1. Prerequisites

| Requirement | Status | How to check |
|-------------|--------|-------------|
| Node.js >= 18 | Required | `node --version` |
| pnpm 9.x | Required | `pnpm --version` |
| eas-cli installed | Required | `npm install -g eas-cli` |
| EAS logged in | Required | `eas whoami` (should show `elshawaf`) |
| Google Play Developer account | Required | $25 one-time at https://play.google.com/console/signup |
| Paymob merchant account | Required | https://paymob.com |

---

## 2. Fix system_settings Permission Error

If you see `permission denied for table system_settings` in the app:

### Step 2.1: Run the Fix SQL
1. Go to Supabase Dashboard → SQL Editor
2. Copy and run the contents of `supabase/33-fix-system-settings-rls.sql`
3. You should see the settings returned in the result

### Step 2.2: Verify
Run this query in SQL Editor:
```sql
SELECT key, value, is_active FROM public.system_settings ORDER BY sort_order;
```
You should see 10 rows (delivery_fee, free_shipping_threshold, etc.)

---

## 3. Supabase Backend Setup

### Step 3.1: Apply All SQL Migrations
Run these in order in Supabase SQL Editor:
1. `supabase/32-system-settings.sql` — system_settings table
2. `supabase/33-fix-system-settings-rls.sql` — fix RLS policies

### Step 3.2: Set Edge Function Secrets
```bash
cd supabase
supabase secrets set PAYMOB_SECRET_KEY=egy_sk_live_YOUR_KEY
supabase secrets set PAYMOB_HMAC=YOUR_HMAC_KEY
supabase secrets set EXPO_ACCESS_TOKEN=YOUR_EXPO_PUSH_TOKEN
```

Verify:
```bash
supabase secrets list
```

### Step 3.3: Deploy Edge Functions
```bash
supabase functions deploy paymob-intent
supabase functions deploy paymob-webhook
supabase functions deploy notification-broadcast
supabase functions deploy auth-redirect
```

### Step 3.4: Configure Auth Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:
- Redirect URLs: add `https://elshawaf1.github.io/mawada-redirect/`
- Site URL: leave default

---

## 4. Paymob Production Keys

### Step 4.1: Get Production Keys from Paymob Dashboard
1. Log into https://dashboard.paymob.com
2. Switch from "Test" to "Production" environment
3. Note these values:
   - **Public Key**: `egy_pk_live_...`
   - **Secret Key**: `egy_sk_live_...`
   - **HMAC Key**: `egy_hmac_live_...`
   - **Card Integration ID** (production): numeric ID
   - **Wallet Integration ID** (production): numeric ID

### Step 4.2: Set Server Secrets
```bash
supabase secrets set PAYMOB_SECRET_KEY=egy_sk_live_...
supabase secrets set PAYMOB_HMAC=egy_hmac_live_...
```

### Step 4.3: Set Mobile App Secrets (EAS)
```bash
cd apps/mobile
eas secret:create --scope project --name EXPO_PUBLIC_PAYMOB_PUBLIC_KEY --value "egy_pk_live_..."
eas secret:create --scope project --name EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID --value "YOUR_CARD_ID"
eas secret:create --scope project --name EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID --value "YOUR_WALLET_ID"
```

> **Note:** The Supabase URL and anon key are already set. Only update Paymob keys.

---

## 5. App Configuration

### Step 5.1: Update `apps/mobile/app.json`
Changes needed:
```json
{
  "expo": {
    "name": "Mawada Phone",
    "slug": "mawada-phone",
    "newArchEnabled": false,
    "splash": {
      "backgroundColor": "#0F2A44"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0F2A44"
      }
    }
  }
}
```

Key changes:
- `name` → `"Mawada Phone"` (English)
- `slug` → `"mawada-phone"`
- `newArchEnabled` → `false` (required for Paymob SDK compatibility)
- Splash/adaptive icon background → `#0F2A44` (brand navy)

### Step 5.2: Delete Stale Native Directories
```bash
cd apps/mobile
rm -rf android ios
```

### Step 5.3: Regenerate Native Directories
```bash
npx expo prebuild --clean
```

This regenerates `android/` and `ios/` with:
- Correct `applicationId`: `com.mawada.phone`
- Correct `namespace`: `com.mawada.phone`
- Paymob plugin with correct paths
- No hardcoded local paths
- New Architecture disabled

### Step 5.4: Verify
Check `android/app/build.gradle`:
- `applicationId 'com.mawada.phone'` ✅
- `namespace 'com.mawada.phone'` ✅

Check `android/build.gradle`:
- No `/home/elshawaf/` hardcoded paths ✅

---

## 6. Replace App Assets

All 4 image assets are currently Expo defaults (concentric circles). Replace them:

### Step 6.1: Create Icon Assets
Use the Mawada Phone logo (the one with the M in a circle).

| File | Size | Description |
|------|------|-------------|
| `assets/icon.png` | 1024x1024 PNG | App icon — logo on solid navy background (#0F2A44) |
| `assets/adaptive-icon.png` | 1024x1024 PNG | Android adaptive icon — logo on transparent background |
| `assets/splash-icon.png` | 500x500 PNG | Splash screen — logo centered, transparent background |
| `assets/favicon.png` | 48x48 PNG | Web favicon — small M icon |

### Step 6.2: How to Create
1. Open the Mawada Phone logo in any image editor
2. For `icon.png`: Place logo on a 1024x1024 canvas with #0F2A44 background
3. For `adaptive-icon.png`: Place logo on 1024x1024 transparent canvas (Android adds background)
4. For `splash-icon.png`: Center logo on transparent canvas
5. For `favicon.png`: Resize logo to 48x48

### Step 6.3: Replace Files
Overwrite the existing files in `apps/mobile/assets/`:
```bash
# Copy your new files to these locations:
# apps/mobile/assets/icon.png
# apps/mobile/assets/adaptive-icon.png
# apps/mobile/assets/splash-icon.png
# apps/mobile/assets/favicon.png
```

---

## 7. Build the App

### Step 7.1: Preview Build (Internal Testing)
```bash
cd apps/mobile
eas build --profile preview --platform android
```

This creates an APK for direct installation. EAS will:
1. Upload your code to Expo's build servers
2. Run `expo prebuild` to generate native code
3. Build the APK
4. Give you a download link

### Step 7.2: Install on Your Phone
1. Open the download link on your Android phone
2. Download and install the APK
3. Test everything:
   - [ ] App opens without crash
   - [ ] Logo shows correctly (not Expo circles)
   - [ ] Registration works
   - [ ] Login works
   - [ ] Browse products
   - [ ] Add to cart
   - [ ] Cart shows correct delivery fee (90 EGP)
   - [ ] Checkout with VISA (Paymob)
   - [ ] Checkout with Wallet (Paymob)
   - [ ] Checkout with COD
   - [ ] Password reset flow
   - [ ] Push notifications registered

### Step 7.3: Production Build (Play Store)
Once preview is verified:
```bash
cd apps/mobile
eas build --profile production --platform android
```

This creates an AAB (Android App Bundle) for Play Store upload.

---

## 8. Google Play Console Setup

### Step 8.1: Create App in Play Console
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: **Mawada Phone**
   - Default language: **Arabic**
   - App or game: **App**
   - Free or paid: **Free**
4. Accept Play Developer policies

### Step 8.2: Store Listing
| Field | Value |
|-------|-------|
| App name | Mawada Phone |
| Short description | Shop phones and electronics online at the best prices |
| Full description | Mawada Phone - your favorite app for buying phones and electronic devices. Browse products, compare prices, and buy easily. Secure payment via Visa, wallet, or cash on delivery. Fast shipping and home delivery. |
| Privacy Policy URL | `https://elshawaf1.github.io/mawada-redirect/privacy.html` |
| Category | Electronics & Accessories > Phones |
| Contact email | elshawafa04@gmail.com |

### Step 8.3: Graphic Assets
| Asset | Required | Size |
|-------|----------|------|
| App icon | Yes | 512x512 PNG |
| Feature graphic | Yes | 1024x500 PNG |
| Phone screenshots | Yes (min 2) | 16:9 or 9:16 |
| Tablet screenshots | Recommended | 7" and/or 10" |

### Step 8.4: Content Rating
- Complete the IARC questionnaire
- E-commerce app with no user-generated content → likely "Everyone"

### Step 8.5: Data Safety
| Question | Answer |
|----------|--------|
| What data does your app collect? | Name, Email, Phone, Address |
| Is data transmitted off-device? | Yes (Supabase, Paymob) |
| Is data encrypted in transit? | Yes |
| Can users request data deletion? | Yes (see privacy policy) |
| Do you use third-party analytics? | No |

### Step 8.6: Set Up Internal Testing Track
1. Go to Testing → Internal testing
2. Create new release
3. Upload the AAB file from EAS build
4. Add testers by email (up to 100)
5. Roll out to internal testers

---

## 9. Submit to Play Store

### Option A: Using EAS Submit (Recommended)
```bash
cd apps/mobile
eas submit --profile production --platform android
```

Requires Google Play service account setup (see Step 8 in the main plan).

### Option B: Manual Upload
1. Download the AAB from EAS build
2. Go to Play Console → Production → Create new release
3. Upload the AAB
4. Add release notes
5. Roll out to production

---

## 10. Post-Launch Checklist

### Day 1
- [ ] App appears in Play Store search
- [ ] Can install from Play Store
- [ ] All features work in production
- [ ] Paymob payments process correctly
- [ ] Push notifications deliver
- [ ] No crashes in Android vitals

### Week 1
- [ ] Monitor crash reports in Play Console
- [ ] Check edge function logs in Supabase
- [ ] Verify payment success rates in Paymob dashboard
- [ ] Respond to any user reviews

### Ongoing
- [ ] Update app with new features
- [ ] Monitor performance metrics
- [ ] Keep dependencies updated
- [ ] Maintain privacy policy

---

## Quick Reference Commands

```bash
# Fix RLS
# Run supabase/33-fix-system-settings-rls.sql in Supabase SQL Editor

# Set secrets
supabase secrets set PAYMOB_SECRET_KEY=... PAYMOB_HMAC=...

# Deploy functions
supabase functions deploy paymob-intent paymob-webhook notification-broadcast auth-redirect

# Set mobile secrets
eas secret:create --scope project --name EXPO_PUBLIC_PAYMOB_PUBLIC_KEY --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_PAYMOB_CARD_INTEGRATION_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_PAYMOB_WALLET_INTEGRATION_ID --value "..."

# Build
cd apps/mobile
rm -rf android ios
npx expo prebuild --clean
eas build --profile preview --platform android    # Test build
eas build --profile production --platform android  # Play Store build

# Submit
eas submit --profile production --platform android
```

---

## Troubleshooting

### App crashes on startup
- Make sure `newArchEnabled: false` in app.json
- Run `npx expo prebuild --clean` to regenerate native dirs

### "permission denied for table system_settings"
- Run `supabase/33-fix-system-settings-rls.sql` in SQL Editor

### Paymob payment fails
- Check that production keys are set in both Supabase secrets AND EAS secrets
- Verify integration IDs match the production environment

### Build fails on EAS
- Check that no hardcoded paths exist in android/build.gradle
- Run `npx expo prebuild --clean` locally first
- Check EAS build logs for specific errors

### App shows Expo default icon
- Replace `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`
- Run `npx expo prebuild --clean` after replacing
