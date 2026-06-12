## Password Reset — Supabase Dashboard Setup

### Step 1: URL Configuration
Go to: **Authentication → URL Configuration**

- **Site URL**: leave as-is (your Supabase project URL)
- **Redirect URLs**: Add these:
  ```
  mawada://reset-password
  mawada://**
  ```

### Step 2: Email Template
Go to: **Authentication → Email Templates → Reset Password**

Set **Subject** to:
```
إعادة تعيين كلمة المرور - مودة فون
```

Paste the HTML from: `supabase/email-templates/reset-password.html`

### Step 3: Test
1. Enter email in ForgotPasswordScreen
2. Check email → click link
3. Should open Supabase verify page → redirect to app → ResetPassword screen
4. If browser redirect fails → PASSWORD_RECOVERY event catches it automatically
