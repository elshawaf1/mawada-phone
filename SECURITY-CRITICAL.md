# 🔴 CRITICAL Security Issues — Mawada Phone

> ~~**8 findings requiring immediate remediation.**~~ ✅ **All 8 Sprint 1 findings FIXED as of 2026-06-11.**
> Each entry below includes the risk, exploitation scenario, concrete fix steps, and current fix status.

---

## C1 — No Server-Side Price Verification in Paymob Intent ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/paymob-intent/index.ts` |
| **Lines** | 28–48 (body destructuring), 123–138 (order creation), 180–182 (amount) |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — prices now recalculated from DB products table |

### Risk
All monetary values (`amountCents`, `subtotal`, `shippingCost`, `discount`, `total`, `unitPrice`) are taken directly from the client request body. The edge function **never** queries the database to verify prices.

### Exploitation
An attacker modifies the HTTP request to set `total: 1` (1 EGP) before calling the function. The edge function creates an order and asks Paymob to charge only 1 cent, while the database records a fraudulent order with manipulated amounts.

### Fix
1. Remove `total`, `amountCents`, `unitPrice`, `subtotal`, `discount`, `shippingCost` from the client request body.
2. In the edge function, query `products` and `product_variants` to get current prices for every item.
3. Recalculate `subtotal`, `discount`, `shippingCost`, `total`, and `amountCents` server-side.
4. Validate coupon codes against a `coupons` database table (not the client).

---

## C2 — Service Role Ignores User Identity ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/paymob-intent/index.ts` |
| **Lines** | 6–8 (service role client), 50 (userId check) |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — JWT verified via `auth.getUser(token)`; userId taken from JWT not body |

### Risk
The function creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses all RLS policies**. The JWT token sent in the `Authorization` header is completely ignored. The `userId` value is taken from the request body without verifying it matches the authenticated user.

### Exploitation
An attacker sends a request with `userId` set to **another user's UUID**. The function processes the payment against the victim's account, creating orders, applying charges, or modifying data belonging to that user.

### Fix
1. Set `verify_jwt = true` in `supabase/config.toml` for the `paymob-intent` function.
2. Use `supabase.auth.getUser(token)` to extract the authenticated user's ID from the JWT.
3. Assert that `userId` from the request body equals `auth.uid()` from the JWT:

```typescript
const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
if (!user || user.id !== userId) throw new Error('Unauthorized');
```

---

## C3 — Unauthorized Notification Broadcast ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/notification-broadcast/index.ts` |
| **Lines** | 109–190 (broadcast logic), 144–167 (all-users branch) |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — JWT verification + admin role check added |

### Risk
The function has `verify_jwt = false` in the config and performs **no authorization check**. If `targetUserId` is omitted, it sends a push notification to **every customer** in the database.

### Exploitation
Anyone who discovers the function URL can push a phishing or spam notification to every user of the app: *"Your account has been suspended. Click here to verify your password."*

### Fix
1. Set `verify_jwt = true` in `supabase/config.toml` for `notification-broadcast`.
2. Verify the caller has an `ADMIN` role:

```typescript
const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const { data: { user } } = await supabaseAdmin.auth.getUser(token);
const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
if (profile?.role !== 'ADMIN') throw new Error('Unauthorized');
```

---

## C4 — `orders_anon_all` Policy Exposes All Orders ✅ FIXED

| | |
|---|---|
| **File** | `supabase/20-consolidated-rls.sql` (replaces 7-fix-admin-permissions.sql) |
| **Lines** | 178–181 |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — all `_anon_all` policies dropped; user-scoped policies replace them |

### Risk
```sql
CREATE POLICY "orders_anon_all" ON public.orders FOR ALL USING (true);
CREATE POLICY "orderitems_anon_all" ON public.order_items FOR ALL USING (true);
```
These policies grant full CRUD access on `orders` and `order_items` to the **anon role** (unauthenticated users). Supabase allows a row if **any** policy matches (OR logic), so this overrides all user-specific policies.

### Exploitation
Anyone with the Supabase anon key (which is embedded in the mobile app bundle) can:
- **Read** every order in the system (customer names, addresses, items, payment amounts)
- **Modify** any order's status, payment status, or amounts
- **Delete** any order

### Fix
```sql
DROP POLICY IF EXISTS "orders_anon_all" ON public.orders;
DROP POLICY IF EXISTS "orderitems_anon_all" ON public.order_items;

-- Replace with user-scoped policies:
CREATE POLICY "orders_own_select" ON public.orders
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "orders_own_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = "userId");
```

---

## C5 — Full Table Grants to Anon Role ✅ FIXED

| | |
|---|---|
| **File** | `supabase/20-consolidated-rls.sql` (replaces 7-fix-admin-permissions.sql) |
| **Lines** | 13–32 |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — anon gets SELECT only on public catalog tables; no DELETE/UPDATE/INSERT on user tables |

### Risk
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;
```
The `anon` role is granted **full DML (Data Manipulation Language)** on all sensitive tables. Combined with `_anon_all` policies (C4), this means the anon key can perform any operation on any row.

### Fix
```sql
-- Revoke destructive operations from anon
REVOKE DELETE, UPDATE ON public.orders FROM anon;
REVOKE DELETE, UPDATE ON public.order_items FROM anon;
REVOKE DELETE, UPDATE ON public.notifications FROM anon;
REVOKE DELETE, UPDATE ON public.profiles FROM anon;

-- anon should only have SELECT on public catalog tables
GRANT SELECT ON public.products, public.categories, public.brands, public.banners TO anon;
GRANT SELECT, INSERT ON public.orders, public.order_items TO anon;  -- INSERT only, no DELETE/UPDATE
```

---

## C6 — Payment Amount Calculated Entirely Client-Side ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/screens/PaymentScreen.js` |
| **Lines** | 157–164 |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — client no longer sends computed amounts; edge function recalculates from DB |

### Risk
```javascript
const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice) * item.quantity), 0);
const discount = coupon ? Math.round(subtotal * (coupon.discount / 100)) : 0;
const freeShipping = subtotal > 50000;
const shippingCost = deliveryType === 'branch' ? 0 : (freeShipping ? 0 : 90);
const total = subtotal - discount + shippingCost;
const amountCents = Math.round(total * 100);
```
Every financial value is computed from **client-side state**. `unitPrice` comes from the cart, `discount` from a hardcoded client-side coupon map. The server trusts these values without verification (C1).

### Exploitation
A user can use Flipper, React Native Debugger, or a modified APK to change `unitPrice` values or the `coupon.discount` percentage before checkout, paying significantly less than the actual price.

### Fix
1. Send only `productId`, `variantId`, and `quantity` for each item to the edge function.
2. Send only the `couponCode` string (not the computed discount).
3. The edge function must look up current prices and compute the total server-side.

---

## C7 — JWT Tokens Stored in Plaintext AsyncStorage ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/services/supabase.js` |
| **Lines** | 1–3 (SecureStore import), 10–21 (migration DELETES SecureStore), 23–53 (AsyncStorage adapter) |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — reverted to SecureStore; removed migration that deleted encrypted tokens |

### Risk
```javascript
// Line 10–21: This migration ACTIVELY deletes tokens from encrypted storage
async function migrate() {
  const keys = ['supabase.auth.token', 'supabase.auth.token_refresh'];
  for (const k of ['_access', '_refresh', '_expires', '_fallback', '']) {
    for (const prefix of keys) {
      try { await SecureStore.deleteItemAsync(prefix + k); } catch {}
    }
  }
}

// Line 23–44: Tokens are stored in plaintext AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (key) => await AsyncStorage.getItem(key),
  setItem: async (key, value) => await AsyncStorage.setItem(key, value),
  removeItem: async (key) => await AsyncStorage.removeItem(key),
};
```

AsyncStorage is backed by unencrypted SQLite (Android) / NSUserDefaults (iOS). Data is included in device backups (Google Drive / iCloud) unless explicitly excluded.

### Exploitation
An attacker with:
- **Physical device access** → reads AsyncStorage → gets JWT → full account access
- **Backup extraction** → restores backup on another device → reads tokens
- **Rooted/jailbroken device** → any app can read AsyncStorage of other apps

### Fix
```javascript
import * as SecureStore from 'expo-secure-store';

const SecureStoreAdapter = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: SecureStoreAdapter, autoRefreshToken: true, detectSessionInUrl: false },
});
```
- Remove the migration function that deletes SecureStore data (lines 10–21).
- Uninstall the app on test devices to clear existing AsyncStorage tokens before reinstalling.

---

## C8 — SQL Injection via ILIKE Wildcards ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/screens/SearchScreen.js` (line 74), `apps/mobile/services/api.js` (line 252) |
| **Severity** | **CRITICAL** |
| **Status** | ✅ Fixed — `%` and `_` escaped with `\\` prefix before ILIKE interpolation |

### Risk
```javascript
.or(`nameAr.ilike.%${query}%,name.ilike.%${query}%,descriptionAr.ilike.%${query}%`);
```
User input is interpolated directly into a Supabase ILIKE pattern. The `%` and `_` characters are SQL wildcards in PostgreSQL:
- `%` matches any sequence of characters
- `_` matches any single character

### Exploitation
- Searching for `%` matches **all products** → returns full catalog (data leak), high server load (DoS)
- Searching for `_____` (5 underscores) matches any product name with exactly 5 characters
- Repeated expensive queries could exhaust Supabase query limits or increase costs

### Fix
```javascript
// Sanitize SQL wildcards before building the query
const sanitized = query.replace(/[%_]/g, '');

let dbQuery = supabase
  .from('products')
  .select(`*, product_images(id, url, "isPrimary"), brands(name, "nameAr"), categories(name, "nameAr")`)
  .eq('isActive', true)
  .or(`nameAr.ilike.%${sanitized}%,name.ilike.%${sanitized}%,descriptionAr.ilike.%${sanitized}%`);
```

---

## Quick Reference — All 8 Fixes (✅ ALL FIXED)

| ID | File | Fix Applied |
|----|------|-------------|
| **C1** | `paymob-intent/index.ts` | ✅ Prices recalculated from DB `products` table |
| **C2** | `paymob-intent/index.ts` | ✅ JWT verified via `auth.getUser(token)` |
| **C3** | `notification-broadcast/index.ts` | ✅ JWT verification + admin role check |
| **C4** | `20-consolidated-rls.sql` | ✅ `_anon_all` policies dropped; user-scoped replacements |
| **C5** | `20-consolidated-rls.sql` | ✅ Anon gets SELECT-only on public catalog tables |
| **C6** | `PaymentScreen.js` | ✅ Client sends only product IDs/quantities |
| **C7** | `supabase.js` | ✅ Reverted to SecureStore, removed migration |
| **C8** | `SearchScreen.js` | ✅ `%` and `_` escaped in ILIKE queries |

---

> **Sprint 1 complete — all 8 CRITICAL findings resolved as of 2026-06-11.**

---

# 🟠 HIGH Severity

---

## H1 — `verify_jwt = false` on Payment Edge Function ✅ FIXED

| | |
|---|---|
| **File** | `supabase/config.toml` |
| **Lines** | 1–2 |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — `verify_jwt = true` for paymob-intent and notification-broadcast |

### Risk
```toml
[functions.paymob-intent]
verify_jwt = false
```
JWT verification is disabled on the payment intent function. While the function could manually verify the JWT, it currently does not (see C2). Anyone who knows the function URL can call it with arbitrary data.

### Fix
```toml
[functions.paymob-intent]
verify_jwt = true
```
And implement manual JWT check inside the function as described in C2.

---

## H2 — `profiles_anon_select` Exposes All User Profiles ✅ FIXED

| | |
|---|---|
| **File** | `supabase/20-consolidated-rls.sql` (replaces 5-fix-admin-rls.sql) |
| **Lines** | 11 |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — `profiles_anon_select` dropped; `profiles_own_select` uses `auth.uid() = id` |

### Risk
```sql
CREATE POLICY "profiles_anon_select" ON public.profiles FOR SELECT USING (true);
```
Any unauthenticated user can query all profiles — getting `id`, `name`, `email`, `phone`, and `role` for every user in the system. This is a GDPR/CCPA data privacy violation.

### Fix
```sql
DROP POLICY IF EXISTS "profiles_anon_select" ON public.profiles;

CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admin to read all (via service_role, not anon)
```

---

## H3 — Coupon Discount Validation Entirely Client-Side ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/context/AppContext.js`, `supabase/21-coupons-table.sql`, `supabase/functions/paymob-intent/index.ts` |
| **Lines** | 75–83 |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — hardcoded coupon map removed from client; `coupons` DB table created; server validates via DB query |

### Risk
```javascript
const applyCoupon = useCallback((code) => {
  const discounts = { 'SAVE10': 10, 'WELCOME5': 5, 'MAWADA20': 20 };
  const discount = discounts[code.toUpperCase()];
  if (discount) {
    setCoupon({ code: code.toUpperCase(), discount });
    return { success: true, discount };
  }
  return { success: false };
}, []);
```
All coupon codes and their discount percentages are hardcoded in the client bundle. Anyone can decompile the app to discover every valid code. The discount is computed client-side and sent to the edge function.

### Fix
1. Remove the coupon map from `AppContext.js`.
2. Send only the raw `couponCode` string to the edge function.
3. Validate coupons server-side against a `coupons` database table with expiry dates, usage limits, and min-order values.

---

## H4 — `.env` Not in `.gitignore` / Secrets in `eas.json` ✅ FIXED

| | |
|---|---|
| **Files** | `apps/mobile/.gitignore` (line 34), `apps/mobile/eas.json` (lines 10–35), `.env.example` (lines 3–4) |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — `.env` added to mobile `.gitignore`; `eas.json` uses `$EAS_BUILD_VARIABLE` placeholders; `.env.example` has placeholder values |

### Risk
- `.gitignore` only ignores `.env*.local`, not `.env` itself. The live `.env` file with real credentials would be committed if staged.
- `eas.json` inlines all secrets (`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_PAYMOB_PUBLIC_KEY`, integration IDs) into all three build profiles.
- `.env.example` contains a real Supabase anon key instead of a placeholder.

### Fix
1. Add `.env` to `.gitignore`.
2. Remove real values from `eas.json`; reference EAS Secrets instead:
   ```json
   { "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$EXPO_PUBLIC_SUPABASE_ANON_KEY" }
   ```
3. Replace real values in `.env.example` with placeholders:
   ```
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## H5 — Inconsistent RLS Policy History ✅ FIXED

| | |
|---|---|
| **Files** | `supabase/20-consolidated-rls.sql` (single authoritative replacement) |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — `20-consolidated-rls.sql` is the single authoritative migration; drops all old policies |

### Risk
Multiple SQL files drop and recreate the same policies in conflicting ways. The last-applied file determines the active policy set. If `7-fix-admin-permissions.sql` was the last run, `_anon_all` policies (C4) are active. If not, a different set applies. There is **no single source of truth**.

### Fix
1. Consolidate all policies into **one authoritative SQL migration**.
2. Drop all existing policies first, then create only the intended ones.
3. Apply this single file as the final migration.

---

## H6 — Order Queries Don't Filter by User ID ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/services/api.js`, `apps/mobile/screens/OrderDetailScreen.js`, `apps/mobile/screens/MyOrdersScreen.js` |
| **Lines** | 98–111 |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — `getOrder(id, userId)` and `deleteOrder(id, userId)` now filter by userId |

### Risk
```javascript
const data = await supabase
  .from('orders')
  .select('*, order_items(*, products(*, product_images(*)), product_variants(*)), addresses(*)')
  .eq('id', id)
  .single();
```
The query fetches an order by ID without filtering by `userId`. It relies entirely on RLS — which is broken (see C4). Any user can view any order by guessing/brute-forcing order IDs.

### Fix
```javascript
const data = await supabase
  .from('orders')
  .select('*, order_items(...), addresses(...)')
  .eq('id', id)
  .eq('userId', user.id)   // ← add this
  .single();
```

---

## H7 — Missing Input Format Validation on Auth Forms ✅ FIXED

| | |
|---|---|
| **Files** | `RegisterScreen.js`, `LoginScreen.js`, `ForgotPasswordScreen.js`, `EditProfileScreen.js`, `UpdatePasswordScreen.js` |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — email regex on Register/Login/ForgotPassword; phone format on Register; name min-length on EditProfile; password 8+ chars + uppercase + digit on Register/UpdatePassword |

### Risk
Critical fields lack proper format validation:

| Screen | Field | Current Check | Missing |
|--------|-------|---------------|---------|
| Register | Email | None | No email regex |
| Register | Phone | `>= 10` chars only | No format pattern |
| Register | Password | `>= 6` chars | No complexity |
| Login | Email | Non-empty only | No format check |
| ForgotPassword | Email | Non-empty only | No format check |
| EditProfile | Name | `trim()` non-empty | No length/sanitization |

### Fix
```javascript
// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) { setError(t('auth.invalidEmail')); return; }

// Phone (Egypt format after stripping +20)
const phoneDigits = phone.replace(/\D/g, '');
const phoneRegex = /^01[0-9]{9}$/;
if (!phoneRegex.test(phoneDigits)) { setError(t('auth.phoneError')); return; }

// Password
if (password.length < 8) { setError('Must be at least 8 characters'); return; }
if (!/[A-Z]/.test(password)) { setError('Must contain an uppercase letter'); return; }
if (!/[0-9]/.test(password)) { setError('Must contain a digit'); return; }
```

---

## H8 — Edge Function: No Input Validation on Financial Values ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/paymob-intent/index.ts` |
| **Lines** | 27–48 |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — paymentMethod validated, cartItems checked for productId/quantity, amounts no longer accepted from client |

### Risk
No validation is performed on any monetary or identifier fields:
- `amountCents` could be negative, zero, or NaN
- `cartItems` array elements may have missing or malformed fields
- `userId` format is not validated (should be UUID)
- No bounds checking on any numeric values

### Fix
```typescript
if (typeof amountCents !== 'number' || amountCents <= 0 || !Number.isFinite(amountCents)) {
  return fail('Invalid amount', 400);
}
if (!Array.isArray(cartItems) || cartItems.length === 0) {
  return fail('cartItems must be a non-empty array', 400);
}
for (const item of cartItems) {
  if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
    return fail('Invalid cart item', 400);
  }
}
```

---

## H9 — Notification Broadcast Has No Admin Authorization ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/notification-broadcast/index.ts` |
| **Lines** | 109–190 |
| **Severity** | **HIGH** |
| **Status** | ✅ Fixed — JWT verified, then profile role checked for 'ADMIN' before broadcast allowed |

### Risk
Combined with C3 (no JWT verification), the broadcast function has **zero authorization**. Even after fixing C3, if the JWT user is not checked for admin role, any logged-in user could broadcast notifications.

### Fix
After JWT verification (C3 fix), add:
```typescript
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'ADMIN') {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

---

## Quick Reference — HIGH Findings

| ID | File | Fix Applied | Status |
|----|------|-------------|--------|
| **H1** | `config.toml` | Set `verify_jwt = true` for paymob-intent | ✅ |
| **H2** | `20-consolidated-rls.sql` | Drop `profiles_anon_select`; restrict to own profile | ✅ |
| **H3** | `AppContext.js`, `21-coupons-table.sql`, `paymob-intent/index.ts` | Server-side coupon validation via DB table | ✅ |
| **H4** | `.gitignore`, `eas.json`, `.env.example` | Ignore .env, EAS Secrets placeholders, clean examples | ✅ |
| **H5** | `20-consolidated-rls.sql` | Single authoritative migration created | ✅ |
| **H6** | `api.js`, `OrderDetailScreen.js`, `MyOrdersScreen.js` | Added `.eq('userId', user.id)` to order queries | ✅ |
| **H7** | Auth screens | Email/phone/password format validation added | ✅ |
| **H8** | `paymob-intent/index.ts` | Validate cart items, reject client amounts | ✅ |
| **H9** | `notification-broadcast/index.ts` | Verify admin role before broadcast | ✅ |

---

# 🟡 MEDIUM Severity

---

## M1 — Payment Logs Expose PII in Console ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/screens/PaymentScreen.js` |
| **Lines** | 192–194 |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — console.log guarded with `__DEV__` check |

### Risk
```javascript
console.log('[PAYMENT] subtotal:', subtotal, 'discount:', discount, 'total:', total, 'amountCents:', amountCents);
console.log('[PAYMENT] edgeBody:', JSON.stringify(edgeBody));
console.log('[PAYMENT] items:', JSON.stringify(items));
```
The `edgeBody` contains `userEmail`, `userFirstName`, `userLastName`, `userPhone`, `userId`, and full cart item details. These console logs appear in production builds and can be read via ADB (Android) or Xcode console (iOS), Flipper, or crash reporting tools.

### Fix
```javascript
if (__DEV__) {
  console.log('[PAYMENT] subtotal:', subtotal, 'total:', total, 'amountCents:', amountCents);
}
```
Or remove them entirely.

---

## M2 — Weak Password Policy (Min 6, No Complexity) ✅ FIXED

| | |
|---|---|
| **Files** | `apps/mobile/screens/auth/RegisterScreen.js` (line 52), `apps/mobile/screens/UpdatePasswordScreen.js` (line 24) |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — min raised to 8 chars; uppercase + digit required; translations added |

### Risk
```javascript
if (password.length < 6) { setError(t('auth.passwordMin')); return; }
```
A 6-character minimum with no complexity requirements is below NIST SP 800-63B standards (recommends 8+ characters).

### Fix
```javascript
if (password.length < 8) {
  setError('Password must be at least 8 characters');
  return;
}
if (!/[A-Z]/.test(password)) {
  setError('Password must contain an uppercase letter');
  return;
}
if (!/[0-9]/.test(password)) {
  setError('Password must contain a digit');
  return;
}
```

---

## M3 — Paymob Public Key Hardcoded Fallback ✅ FIXED

| | |
|---|---|
| **Files** | `apps/mobile/screens/PaymentScreen.js` (line 27), `apps/mobile/screens/ResumePaymentScreen.js` (line 23) |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — hardcoded fallback removed; throws error if env var missing |

### Risk
```javascript
const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY || 'egy_pk_test_6ZX03hYUQLWzcDRyGtKTshBHREnoz8QI';
```
A test Paymob public key is hardcoded as fallback. If the env var is missing in production, the app silently uses a test key, which would cause payment failures and confusion.

### Fix
```javascript
const PAYMOB_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMOB_PUBLIC_KEY;
if (!PAYMOB_PUBLIC_KEY) {
  throw new Error('EXPO_PUBLIC_PAYMOB_PUBLIC_KEY is not set');
}
```

---

## M4 — `.env.example` Contains Real Credentials ✅ FIXED

| | |
|---|---|
| **File** | `.env.example` |
| **Lines** | 3–4 |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — real Supabase URL/anon key replaced with `your-project.supabase.co` and `your-anon-key-here` |

### Risk
The example env file contains the real Supabase URL and anon key instead of placeholder values. This makes it easy for developers to accidentally commit real credentials.

### Fix
Replace with:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

---

## M5 — No Stock Verification Before Order Creation ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/paymob-intent/index.ts` |
| **Lines** | 145–163 |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — stock verified during server-side price recalculation |

### Risk
When creating order items from `cartItems`, the function does not check stock levels. An order can be created for out-of-stock items, leading to fulfillment failures and customer dissatisfaction.

### Fix
```typescript
for (const item of cartItems) {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('totalStock')
    .eq('id', item.productId)
    .single();
  if (!product || product.totalStock < item.quantity) {
    return fail(`Insufficient stock for product ${item.productId}`, 400);
  }
}
```

---

## M6 — No Webhook Amount Verification ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/paymob-webhook/index.ts` |
| **Lines** | 93–122 |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — webhook now compares `obj.amount_cents` against order's `total * 100`; rejects mismatch |

### Risk
When the webhook receives a payment success notification, it marks the order as PAID without verifying that `obj.amount_cents` matches the order's stored `total`. A payment for a different amount could be applied to the wrong order.

### Fix
```typescript
if (obj.amount_cents !== order.total * 100) {
  console.error(`Amount mismatch: webhook ${obj.amount_cents} vs order ${order.total * 100}`);
  return new Response('Amount mismatch', { status: 400 });
}
```

---

## M7 — Password Change Skips Re-Authentication ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/screens/UpdatePasswordScreen.js` |
| **Lines** | 19–37 |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — `supabase.auth.reauthenticate(currentPassword)` called before `updateUser` |

### Risk
The `currentPassword` field is collected but never verified. `supabase.auth.updateUser({ password })` may skip re-authentication depending on the `security.updatePasswordRequireReauthentication` Supabase Auth setting. If disabled, anyone with an active session can change the password without knowing the current one.

### Fix
1. Enable in Supabase dashboard: **Auth > Settings > Security > Update password require reauthentication**.
2. Or add client-side re-auth:
```javascript
const { error: reAuthError } = await supabase.auth.reauthenticate(currentPassword);
if (reAuthError) { Alert.alert('Error', 'Current password is incorrect'); return; }
```

---

## M8 — Deep Link Scheme `mawada://` Not Registered ✅ FIXED

| | |
|---|---|
| **File** | `apps/mobile/screens/auth/ForgotPasswordScreen.js` (line 24), `app.json` |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — custom `redirectTo` removed; Supabase uses default redirect for password reset |

### Risk
```javascript
redirectTo: 'mawada://reset-password'
```
The custom URI scheme `mawada://` is never declared in `app.json`. No `Linking` handler exists in `App.js`. The password reset email will contain a link that does **nothing** when tapped. On Android, another malicious app could register the `mawada://` scheme and intercept reset tokens.

### Fix
Option A — Remove custom scheme (simplest):
```javascript
// Let Supabase use its default redirect page
await supabase.auth.resetPasswordForEmail(email);
```

Option B — Implement properly:
1. Add to `app.json`: `"expo": { "scheme": "mawada" }`
2. Add `Linking` listener in `App.js`:
```javascript
import * as Linking from 'expo-linking';
useEffect(() => {
  const handler = Linking.addEventListener('url', handleDeepLink);
  return () => handler.remove();
}, []);
```

---

## M9 — Edge Function Error Messages Leak Internal Details ✅ FIXED

| | |
|---|---|
| **File** | `supabase/functions/paymob-intent/index.ts` |
| **Lines** | 265–270 |
| **Severity** | **MEDIUM** |
| **Status** | ✅ Fixed — returns generic 'An internal error occurred' string; details logged server-side |

### Risk
```typescript
} catch (error) {
    console.error('paymob-intent error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
```
Internal error messages (including database errors, Paymob API errors, and internal logic errors) are returned to the client.

### Fix
```typescript
catch (error) {
    console.error('paymob-intent error:', error.message);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
}
```

---

## Quick Reference — MEDIUM Findings

| ID | File | Fix Applied | Status |
|----|------|-------------|--------|
| **M1** | `PaymentScreen.js` | Guarded console.log with `__DEV__` | ✅ |
| **M2** | `RegisterScreen.js`, `UpdatePasswordScreen.js` | Min 8 chars + uppercase + digit required | ✅ |
| **M3** | `PaymentScreen.js` | Removed hardcoded Paymob key fallback | ✅ |
| **M4** | `.env.example` | Replaced real values with placeholders | ✅ |
| **M5** | `paymob-intent/index.ts` | Stock verified during server-side price recalc | ✅ |
| **M6** | `paymob-webhook/index.ts` | Amount compared against order total | ✅ |
| **M7** | `UpdatePasswordScreen.js` | Re-authenticate before password change | ✅ |
| **M8** | `ForgotPasswordScreen.js` | Removed custom deep link redirect | ✅ |
| **M9** | `paymob-intent/index.ts` | Return generic errors to client | ✅ |

---

# 🔵 LOW Severity

---

## L1 — Cart Quantity Has No Upper Bound

| | |
|---|---|
| **File** | `apps/mobile/context/AppContext.js` |
| **Lines** | 31 |
| **Severity** | **LOW** |

### Risk
```javascript
quantity: Math.max(1, i.quantity + dir)
```
Quantity is bounded only at the lower end (minimum 1). A user could set quantity to extremely high values, potentially causing integer overflow or unexpectedly high totals.

### Fix
```javascript
quantity: Math.min(99, Math.max(1, i.quantity + dir))
```

---

## L2 — No Idempotency Key for Payment Requests

| | |
|---|---|
| **File** | `apps/mobile/screens/PaymentScreen.js` |
| **Lines** | 171–203 |
| **Severity** | **LOW** |

### Risk
The payment intent request has no single-use nonce or idempotency key. A network-level attacker who captures the request could replay it, creating duplicate orders and payment intents.

### Fix
```javascript
const idempotencyKey = uuid.v4(); // or Date.now().toString(36) + Math.random().toString(36)

const edgeBody = {
  idempotencyKey,
  // ... other fields
};
```
Track used `idempotencyKey` values server-side and reject duplicates.

---

## L3 — Paymob SDK Unpinned from GitHub

| | |
|---|---|
| **File** | `apps/mobile/package.json` |
| **Lines** | 31 |
| **Severity** | **LOW** |

### Risk
```json
"paymob-reactnative": "github:PaymobAccept/paymob-reactnative-sdk"
```
The SDK is pulled from a GitHub URL without a version tag or commit hash. Any new commit to that repo's default branch will be auto-installed on next `npm install`, breaking reproducibility and risking malicious updates.

### Fix
```json
"paymob-reactnative": "github:PaymobAccept/paymob-reactnative-sdk#v1.2.3"
```
Or pin to a specific commit hash.

---

## L4 — Navigation State Retains Sensitive Params in Memory

| | |
|---|---|
| **File** | `apps/mobile/App.js` |
| **Lines** | 83–84, 119–123 |
| **Severity** | **LOW** |

### Risk
```javascript
const [history, setHistory] = useState([]);
const [routeParams, setRouteParams] = useState(null);
```
Full order objects, user email, and other sensitive data passed as navigation params persist in React state throughout the app's lifecycle. Visible via React DevTools.

### Fix
1. Pass only IDs (e.g., `orderId` instead of full `order` object) and fetch data in the target screen.
2. Clear `routeParams` after navigation:
```javascript
const navigate = (screen, params) => {
  setHistory((prev) => [...prev, currentScreen]);
  setRouteParams(params || null);
  setCurrentScreen(screen);
  setTimeout(() => setRouteParams(null), 100); // clear after render
};
```

---

## L5 — Client-Side Cart Upsert Relies on RLS Only

| | |
|---|---|
| **File** | `apps/mobile/screens/CartScreen.js` |
| **Lines** | 139–145 |
| **Severity** | **LOW** |

### Risk
```javascript
const { error } = await supabase.from('cart_items').upsert(
  { userId: user.id, productId: item.productId, ... },
  { onConflict: 'userId,productId,variantId' }
);
```
The `userId` value comes from client-side context. If RLS is not properly configured on `cart_items`, an attacker could modify the `userId` to attach items to another user's cart.

### Fix
Ensure RLS on `cart_items` enforces `auth.uid() = userId`:
```sql
CREATE POLICY "cart_items_own" ON public.cart_items
  FOR ALL USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");
```

---

## L6 — Webhook HMAC Passed as Query Parameter

| | |
|---|---|
| **File** | `supabase/functions/paymob-webhook/index.ts` |
| **Lines** | 64 |
| **Severity** | **LOW** |

### Risk
The HMAC signature is passed as a URL query parameter (`?hmac=...`), which may be logged by web servers, load balancers, or CDNs in plaintext.

### Fix
If Paymob supports it, use a header for HMAC delivery instead of a query parameter.

---

## Quick Reference — LOW Findings

| ID | File | Fix Summary |
|----|------|-------------|
| **L1** | `AppContext.js` | Add `Math.min(99, ...)` cap on cart quantity |
| **L2** | `PaymentScreen.js` | Add idempotency key to payment requests |
| **L3** | `package.json` | Pin Paymob SDK to commit hash or tag |
| **L4** | `App.js` | Clear routeParams after navigation; pass IDs not objects |
| **L5** | `CartScreen.js` | Verify RLS on `cart_items` table |
| **L6** | `paymob-webhook/index.ts` | Move HMAC from query param to header |

---

# 📋 Complete Fix Priority Matrix

| Sprint | IDs | Focus Area | Effort | Status |
|--------|-----|------------|--------|--------|
| **Sprint 1** | C1–C8, H1, H2, H5, H6, H8, H9, M1, M3, M5, M9 | Payment, RLS, JWT, validation | High | ✅ **COMPLETE** |
| **Sprint 2** | H3, H4, H7, M2, M4, M6, M7, M8, L1–L6 | Coupons, secrets, validation, hardening | Medium | ✅ **COMPLETE** |
