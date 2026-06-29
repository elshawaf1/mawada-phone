import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_SMTP_HOST = Deno.env.get('BREVO_SMTP_HOST') || 'smtp-relay.brevo.com'
const BREVO_SMTP_PORT = parseInt(Deno.env.get('BREVO_SMTP_PORT') || '587')
const BREVO_SMTP_USER = Deno.env.get('BREVO_SMTP_USER') || ''
const BREVO_SMTP_PASS = Deno.env.get('BREVO_SMTP_PASS') || ''
const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'Mawada Phone'
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'elshawafa26@gmail.com'
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const dataResp = await send(body)
    await send(`QUIT`)
    console.log('[send-email] SMTP sent successfully')
    return true
  } catch (err) {
    console.error('[send-email] SMTP error:', err)
    return false
  } finally {
    conn.close()
  }
}

const statusMap: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد المعالجة',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',
}

const paymentMethodMap: Record<string, string> = {
  COD: 'الدفع عند الاستلام',
  VISA: 'بطاقة بنكية',
  WALLET: 'محفظة إلكترونية',
  VALU: 'valU',
  BRANCH: 'استلام من الفرع',
}

function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ar-EG')} ج.م`
}

function buildItemsHtml(items: Array<{ nameAr: string; name: string; quantity: number; unitPrice: number }>): string {
  return items.map(item => `
    <tr>
      <td style="padding:8px 0;">
        <p style="margin:0;font-size:14px;color:#0F172A;">${item.nameAr || item.name} × ${item.quantity}</p>
      </td>
      <td style="padding:8px 0;text-align:left;">
        <p style="margin:0;font-size:14px;color:#0F172A;font-weight:500;">${formatPrice(item.unitPrice * item.quantity)}</p>
      </td>
    </tr>
  `).join('')
}

function buildDiscountRow(discount: number): string {
  if (discount <= 0) return ''
  return `
    <tr>
      <td style="padding-bottom:10px;">
        <p style="margin:0;font-size:14px;color:#6B7280;">الخصم | Discount</p>
      </td>
      <td style="padding-bottom:10px;text-align:left;">
        <p style="margin:0;font-size:14px;color:#DC2626;font-weight:500;">-${formatPrice(discount)}</p>
      </td>
    </tr>
  `
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{ .${key} }}`, value)
  }
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, "orderNumber", "userId", "paymentMethod", "paymentStatus", status, subtotal, shippingCost, discount, total, notes')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      console.error('[send-order-email] Order not found:', orderId)
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Fetch user profile for email and name
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name, phone')
      .eq('id', order.userId)
      .single()

    if (!profile?.email) {
      console.error('[send-order-email] No email for user:', order.userId)
      return new Response(JSON.stringify({ error: 'No email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch order items with product names
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, "unitPrice", products(nameAr, name)')
      .eq('orderId', orderId)

    const productItems = (items || []).map((item: any) => ({
      nameAr: item.products?.nameAr || '',
      name: item.products?.name || '',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    }))

    // Build template variables
    const vars: Record<string, string> = {
      orderNumber: order.orderNumber || order.id,
      statusAr: statusMap[order.status] || order.status,
      paymentMethodAr: paymentMethodMap[order.paymentMethod] || order.paymentMethod,
      itemsHtml: `<table width="100%" cellpadding="0" cellspacing="0">${buildItemsHtml(productItems)}</table>`,
      subtotal: formatPrice(Number(order.subtotal)),
      shipping: Number(order.shippingCost) > 0 ? formatPrice(Number(order.shippingCost)) : 'مجاني',
      discountRow: buildDiscountRow(Number(order.discount || 0)),
      total: formatPrice(Number(order.total)),
    }

    const html = renderTemplate(getInlineTemplate(), vars)

    // Send via Brevo SMTP
    const recipientEmail = profile.email || 'elshawafa26@gmail.com'
    const subject = `تأكيد الطلب ${order.orderNumber || order.id} | Order Confirmation`
    const sent = await sendViaBrevoSmtp(recipientEmail, subject, html)

    if (!sent) {
      console.error('[send-order-email] Brevo SMTP failed')
      return new Response(JSON.stringify({ error: 'Email send failed via Brevo SMTP' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ success: true, recipient: recipientEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('[send-order-email] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function getInlineTemplate(): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد الطلب</title>
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

          <!-- Status badge -->
          <tr>
            <td style="padding:36px 48px 0;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:100px;padding:10px 28px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#15803D;">تم تأكيد طلبك</p>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;color:#94A3B8;">Your order has been confirmed</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 48px 0;"><div style="height:1px;background-color:#F1F5F9;"></div></td>
          </tr>

          <!-- Order info -->
          <tr>
            <td style="padding:32px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0 0 6px;font-size:11px;color:#94A3B8;font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">رقم الطلب</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#0F172A;font-family:'SF Mono',SFMono-Regular,Menlo,monospace;letter-spacing:0.5px;">{{ .orderNumber }}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0 0 6px;font-size:11px;color:#94A3B8;font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">الحالة</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0F172A;">{{ .statusAr }}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <p style="margin:0 0 6px;font-size:11px;color:#94A3B8;font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">طريقة الدفع</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0F172A;">{{ .paymentMethodAr }}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 48px 0;"><div style="height:1px;background-color:#F1F5F9;"></div></td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding:28px 48px 0;">
              <p style="margin:0 0 20px;font-size:11px;color:#94A3B8;font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">المنتجات</p>
              {{ .itemsHtml }}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 48px;"><div style="height:1px;background-color:#F1F5F9;"></div></td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:28px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <p style="margin:0;font-size:14px;color:#64748B;">المجموع الفرعي</p>
                  </td>
                  <td style="padding-bottom:12px;text-align:left;">
                    <p style="margin:0;font-size:14px;color:#0F172A;font-weight:500;">{{ .subtotal }}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <p style="margin:0;font-size:14px;color:#64748B;">الشحن</p>
                  </td>
                  <td style="padding-bottom:12px;text-align:left;">
                    <p style="margin:0;font-size:14px;color:#0F172A;font-weight:500;">{{ .shipping }}</p>
                  </td>
                </tr>
                {{ .discountRow }}
                <tr>
                  <td style="padding-top:16px;">
                    <div style="height:1px;background-color:#E2E8F0;margin-bottom:16px;"></div>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#0F172A;">الإجمالي</p>
                  </td>
                  <td style="padding-top:16px;text-align:left;">
                    <div style="height:1px;background-color:#E2E8F0;margin-bottom:16px;"></div>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#0F172A;">{{ .total }}</p>
                  </td>
                </tr>
              </table>
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
}
