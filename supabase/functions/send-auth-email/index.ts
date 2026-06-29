import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const BREVO_SMTP_HOST = Deno.env.get('BREVO_SMTP_HOST') || 'smtp-relay.brevo.com'
const BREVO_SMTP_PORT = parseInt(Deno.env.get('BREVO_SMTP_PORT') || '587')
const BREVO_SMTP_USER = Deno.env.get('BREVO_SMTP_USER') || ''
const BREVO_SMTP_PASS = Deno.env.get('BREVO_SMTP_PASS') || ''
const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'Mawada Phone'
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'elshawafa26@gmail.com'
const SEND_EMAIL_HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OTP_TEMPLATE = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{SUBJECT}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 24px rgba(0,0,0,0.04);">

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#0F172A 0%,#1E293B 50%,#334155 100%);"></td>
          </tr>

          <!-- Brand -->
          <tr>
            <td style="padding:40px 48px 0;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">مودة فون</p>
              <p style="margin:6px 0 0;font-size:12px;color:#94A3B8;letter-spacing:1px;text-transform:uppercase;">Mawada Phone</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:36px 48px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#0F172A;">{{TITLE}}</h1>
              <p style="margin:12px 0 0;font-size:14px;color:#64748B;line-height:22px;">{{DESC}}</p>
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td style="padding:32px 48px 0;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:20px 44px;">
                    <span style="font-size:40px;font-weight:800;color:#0F172A;letter-spacing:14px;font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;">{{TOKEN}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding:20px 48px 0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#94A3B8;">هذا الرمز صالح لمدة 5 دقائق فقط</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 48px 0;"><div style="height:1px;background-color:#F1F5F9;"></div></td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:24px 48px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:18px;">{{FOOTER}}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:40px 48px;">
              <div style="height:1px;background-color:#F1F5F9;margin-bottom:28px;"></div>
              <p style="margin:0;font-size:12px;color:#CBD5E1;text-align:center;line-height:18px;">© 2026 مودة فون. جميع الحقوق محفوظة.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

function getEmailConfig(actionType: string) {
  switch (actionType) {
    case 'signup':
      return {
        subject: 'تأكيد الحساب - مودة فون',
        title: 'تأكيد الحساب',
        desc: 'مرحباً بك في مودة فون! استخدم الرمز أدناه لتأكيد حسابك.',
        footer: 'إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      }
    case 'magic_link':
      return {
        subject: 'تسجيل الدخول - مودة فون',
        title: 'تسجيل الدخول',
        desc: 'لقد تلقينا طلباً لتسجيل الدخول إلى حسابك. استخدم الرمز أدناه.',
        footer: 'إذا لم تطلب تسجيل الدخول، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      }
    case 'recovery':
      return {
        subject: 'إعادة تعيين كلمة المرور - مودة فون',
        title: 'إعادة تعيين كلمة المرور',
        desc: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاص بحسابك. استخدم الرمز أدناه.',
        footer: 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      }
    default:
      return {
        subject: 'مودة فون - رمز التحقق',
        title: 'رمز التحقق',
        desc: 'استخدم الرمز أدناه لإكمال العملية.',
        footer: 'إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      }
  }
}

function renderTemplate(template: string, config: { subject: string; title: string; desc: string; footer: string }, token: string): string {
  return template
    .replace('{{SUBJECT}}', config.subject)
    .replace('{{TITLE}}', config.title)
    .replace('{{DESC}}', config.desc)
    .replace('{{TOKEN}}', token)
    .replace('{{FOOTER}}', config.footer)
}

async function sendViaBrevoSmtp(to: string, subject: string, html: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const conn = await Deno.connectTls({ hostname: BREVO_SMTP_HOST, port: 465 })
  const buf = new Uint8Array(4096)

  async function read(): Promise<string> {
    const n = await conn.read(buf)
    return decoder.decode(buf.subarray(0, n || 0))
  }

  async function send(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + '\r\n'))
    return await read()
  }

  try {
    await read()
    await send(`EHLO mawada-phone`)
    await send(`AUTH LOGIN`)
    await send(btoa(BREVO_SMTP_USER))
    await send(btoa(BREVO_SMTP_PASS))
    await send(`MAIL FROM:<${BREVO_SENDER_EMAIL}>`)
    await send(`RCPT TO:<${to}>`)
    await send(`DATA`)
    const body = [
      `From: ${BREVO_SENDER_NAME} <${BREVO_SENDER_EMAIL}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
      `.`,
    ].join('\r\n')
    await send(body)
    await send(`QUIT`)
    return true
  } catch (err) {
    console.error('[send-auth-email] SMTP error:', err)
    return false
  } finally {
    conn.close()
  }
}

async function verifySignature(payload: string, headers: Record<string, string>, secret: string): Promise<boolean> {
  try {
    const signatureHeader = headers['svix-signature'] || headers['x-supabase-webhook-signature'] || ''
    if (!signatureHeader) return false

    const secretBytes = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // svix-signature format: "v1,<base64>,v1,<base642>"
    const parts = signatureHeader.split(' ')
    for (const part of parts) {
      const [version, sigB64] = part.split(',')
      if (version === 'v1' && sigB64) {
        const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
        const timestamp = headers['svix-timestamp'] || ''
        const body = `${timestamp}.${payload}`
        const bodyBytes = new TextEncoder().encode(body)
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes)
        if (valid) return true
      }
    }
    return false
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)

    console.log('[send-auth-email] Request received. Method:', req.method)

    // Parse payload
    let data: any
    try {
      data = JSON.parse(payload)
    } catch {
      console.error('[send-auth-email] Invalid JSON payload')
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const user = data.user
    const email_data = data.email_data

    if (!user?.email || !email_data?.token) {
      console.error('[send-auth-email] Missing user.email or email_data.token')
      return new Response(JSON.stringify({ error: 'Missing data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const actionType = email_data.email_action_type || 'signup'
    const config = getEmailConfig(actionType)
    const html = renderTemplate(OTP_TEMPLATE, config, email_data.token)

    console.log(`[send-auth-email] Sending ${actionType} OTP to ${user.email}`)

    // Send via Brevo SMTP
    const sent = await sendViaBrevoSmtp(user.email, config.subject, html)

    if (!sent) {
      console.error('[send-auth-email] Brevo SMTP failed')
      return new Response(JSON.stringify({ error: 'Email send failed via Brevo SMTP' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('[send-auth-email] Email sent successfully')

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('[send-auth-email] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
