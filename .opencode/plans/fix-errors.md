# Fix Runtime Errors — Implementation Plan

## Files to edit (9 total)

### 1. SafeAreaView deprecation — 6 auth screens

Each file: remove `SafeAreaView` from `'react-native'` import, add `import { SafeAreaView } from 'react-native-safe-area-context'`

| File | Change |
|------|--------|
| `apps/mobile/screens/auth/ForgotPasswordScreen.js` | L2: remove `SafeAreaView`, add new import line |
| `apps/mobile/screens/auth/LoginScreen.js` | L9: remove `SafeAreaView`, add new import line |
| `apps/mobile/screens/auth/RegisterScreen.js` | L9: remove `SafeAreaView`, add new import line |
| `apps/mobile/screens/auth/EmailConfirmationScreen.js` | L8: remove `SafeAreaView`, add new import line |
| `apps/mobile/screens/auth/WelcomeScreen.js` | L9: remove `SafeAreaView`, add new import line |
| `apps/mobile/screens/auth/OtpVerificationScreen.js` | L11: remove `SafeAreaView`, add new import line |

### 2. Realtime subscription cleanup — 3 files

**`apps/mobile/screens/HomeScreen.js`** — L371:
```js
// OLD:
return () => { sub.unsubscribe(); };
// NEW:
return () => { supabase.removeChannel(sub); };
```

**`apps/mobile/screens/ProfileScreen.js`** — L38 + L50:
```js
// OLD (both lines):
return () => { sub.unsubscribe(); };
// NEW (both lines):
return () => { supabase.removeChannel(sub); };
```

**`apps/mobile/screens/NotificationScreen.js`** — L197:
```js
// OLD:
return () => { subscription.unsubscribe(); };
// NEW:
return () => { supabase.removeChannel(subscription); };
```

### 3. Post-fix

```bash
npx expo start -c
```

## Verification

After applying + restarting with cleared cache, confirm these errors are gone:
- `SafeAreaView has been deprecated`
- `ReferenceError: Property 'FONT_WEIGHTS' doesn't exist` (x2)
- `cannot add postgres_changes callbacks for realtime:home-notifications after subscribe()`

The FCM push notification error (`FirebaseApp is not initialized`) is a separate setup task — requires following https://docs.expo.dev/push-notifications/fcm-credentials/ to configure Firebase credentials for the Android app.
