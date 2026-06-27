import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const PAYMOB_HMAC = Deno.env.get('PAYMOB_HMAC')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyHmac(hmacFromQuery: string, payload: Record<string, any>): Promise<boolean> {
  if (!hmacFromQuery || !PAYMOB_HMAC) return false

  const obj = payload.obj
  if (!obj) return false

  const hmacFields = [
    String(obj.amount_cents ?? ''),
    obj.created_at ?? '',
    obj.currency ?? '',
    String(obj.error_occured ?? ''),
    String(obj.has_parent_transaction ?? ''),
    String(obj.id ?? ''),
    String(obj.integration_id ?? ''),
    String(obj.is_3d_secure ?? ''),
    String(obj.is_auth ?? ''),
    String(obj.is_capture ?? ''),
    String(obj.is_refunded ?? ''),
    String(obj.is_standalone_payment ?? ''),
    String(obj.is_voided ?? ''),
    String(obj.order?.id ?? ''),
    String(obj.owner ?? ''),
    String(obj.pending ?? ''),
    String(obj.source_data?.pan ?? ''),
    obj.source_data?.sub_type ?? '',
    obj.source_data?.type ?? '',
    String(obj.success ?? ''),
  ]

  const concatenated = hmacFields.join('')

  const encoder = new TextEncoder()
  const keyData = encoder.encode(PAYMOB_HMAC)
  const messageData = encoder.encode(concatenated)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, messageData)
  const expectedSig = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return hmacFromQuery === expectedSig
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const hmacFromQuery = url.searchParams.get('hmac') || ''

    const body = await req.text()
    const payload = JSON.parse(body)
    const obj = payload.obj

    if (!obj?.id) {
      console.error('Invalid webhook payload')
      return new Response('OK', { status: 200 })
    }

    const hmacValid = await verifyHmac(hmacFromQuery, payload)
    if (!hmacValid) {
      console.error('HMAC verification failed')
      return new Response('Unauthorized', { status: 401 })
    }

    const paymobOrderId = obj.order?.id
    if (!paymobOrderId) {
      console.error('No order.id in webhook payload')
      return new Response('OK', { status: 200 })
    }

    const merchantOrderId = obj.order?.merchant_order_id
    if (!merchantOrderId) {
      console.error('No merchant_order_id in webhook payload')
      return new Response('OK', { status: 200 })
    }

    const isSuccess = obj.success === true
    const isFailed = obj.success === false && obj.error_occured === true

    if (isSuccess) {
      const { data: orders, error: findError } = await supabase
        .from('orders')
        .select('id, total, "userId", "orderNumber"')
        .eq('id', String(merchantOrderId))
        .limit(1)

      if (findError) {
        console.error('Error finding order:', findError)
        return new Response('OK', { status: 200 })
      }

      if (orders && orders.length > 0) {
        const order = orders[0]
        const expectedAmountCents = Math.round(Number(order.total) * 100)
        const actualAmountCents = Number(obj.amount_cents)

        if (actualAmountCents !== expectedAmountCents) {
          console.error(`Amount mismatch: webhook ${actualAmountCents} vs order ${expectedAmountCents} for order ${order.id}`)
          return new Response('Amount mismatch', { status: 400 })
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Error updating order to PAID:', updateError)
        }

        // Send push notification via notification-broadcast
        try {
          await fetch(`${supabaseUrl}/functions/v1/notification-broadcast`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: 'payment_success',
              userId: order.userId,
              title: 'تم الدفع بنجاح',
              body: `طلبك رقم #${order.orderNumber} تم الدفع عليه بنجاح`,
              orderId: order.id,
            }),
          })
        } catch (broadcastErr) {
          console.error('Push notification error:', broadcastErr.message)
        }
      } else {
        console.error('No order found for merchantOrderId:', merchantOrderId)
      }
    } else if (isFailed) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('id', String(merchantOrderId))
        .limit(1)

      if (orders && orders.length > 0) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            paymentStatus: 'FAILED',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', orders[0].id)

        if (updateError) {
          console.error('Error updating order to FAILED:', updateError)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response('OK', { status: 200 })
  }
})
