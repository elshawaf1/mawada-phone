import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYMOB_PUBLIC_KEY = Deno.env.get('EXPO_PUBLIC_PAYMOB_PUBLIC_KEY') || Deno.env.get('PAYMOB_PUBLIC_KEY') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Try to verify user from JWT (best effort — don't block if token is expired)
    let userId: string | null = null
    if (token) {
      try {
        const userClient = createClient(supabaseUrl, supabaseServiceKey)
        const { data: { user } } = await userClient.auth.getUser(token)
        if (user) userId = user.id
      } catch (_) {}
    }

    // Fetch order from DB (with or without userId check)
    let orderQuery = supabase
      .from('orders')
      .select('id, "paymobClientSecret", "paymobIntentionId", "paymentStatus", total, userId')
      .eq('id', orderId)

    if (userId) {
      orderQuery = orderQuery.eq('userId', userId)
    }

    const { data: order, error: orderErr } = await orderQuery.single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Already PAID - nothing to do
    if (order.paymentStatus === 'PAID') {
      return new Response(JSON.stringify({
        status: 'PAID',
        orderId: order.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Already FAILED - nothing to do
    if (order.paymentStatus === 'FAILED') {
      return new Response(JSON.stringify({
        status: 'FAILED',
        orderId: order.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Query Paymob intention status using client_secret
    if (order.paymobClientSecret && PAYMOB_PUBLIC_KEY) {
      try {
        const intentionUrl = `https://accept.paymob.com/v1/intention/element/${PAYMOB_PUBLIC_KEY}/${order.paymobClientSecret}/`
        console.log('[paymob-verify] Querying intention:', intentionUrl.substring(0, 80))

        const paymobRes = await fetch(intentionUrl)

        if (paymobRes.ok) {
          const intention = await paymobRes.json()
          console.log('[paymob-verify] Intention status:', intention?.status, 'confirmed:', intention?.confirmed)

          // Check intention status
          const intentionStatus = (intention?.status || '').toLowerCase()
          const isPaid = intentionStatus === 'paid' ||
                         intentionStatus === 'success' ||
                         intention?.confirmed === true

          if (isPaid) {
            console.log('[paymob-verify] Payment CONFIRMED via Paymob API!')
            await supabase
              .from('orders')
              .update({
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
                updatedAt: new Date().toISOString(),
              })
              .eq('id', order.id)

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
                  body: `طلبك تم الدفع عليه بنجاح`,
                  orderId: order.id,
                }),
              })
            } catch (_) {}

            return new Response(JSON.stringify({
              status: 'PAID',
              orderId: order.id,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          }

          const isFailed = intentionStatus === 'failed' ||
                           intentionStatus === 'cancelled' ||
                           intentionStatus === 'expired'

          if (isFailed) {
            console.log('[paymob-verify] Payment FAILED via Paymob API')
            await supabase
              .from('orders')
              .update({
                paymentStatus: 'FAILED',
                updatedAt: new Date().toISOString(),
              })
              .eq('id', order.id)

            return new Response(JSON.stringify({
              status: 'FAILED',
              orderId: order.id,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          }

          // Still pending - check if there are successful transactions
          const transactions = intention?.transactions || []
          const successfulTrx = transactions.find((t: any) => t.success === true)
          if (successfulTrx) {
            console.log('[paymob-verify] Found successful transaction:', successfulTrx.id)
            await supabase
              .from('orders')
              .update({
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
                updatedAt: new Date().toISOString(),
              })
              .eq('id', order.id)

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
                  body: `طلبك تم الدفع عليه بنجاح`,
                  orderId: order.id,
                }),
              })
            } catch (_) {}

            return new Response(JSON.stringify({
              status: 'PAID',
              orderId: order.id,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          }

          const failedTrx = transactions.find((t: any) => t.success === false && t.error_occured === true)
          if (failedTrx && transactions.length > 0) {
            console.log('[paymob-verify] Found failed transaction:', failedTrx.id)
            await supabase
              .from('orders')
              .update({
                paymentStatus: 'FAILED',
                updatedAt: new Date().toISOString(),
              })
              .eq('id', order.id)

            return new Response(JSON.stringify({
              status: 'FAILED',
              orderId: order.id,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          }

          // Truly still pending
          return new Response(JSON.stringify({
            status: 'PENDING',
            orderId: order.id,
            intentionStatus: intentionStatus || 'unknown',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        } else {
          const errText = await paymobRes.text()
          console.error('[paymob-verify] Intention API error:', paymobRes.status, errText.substring(0, 200))
        }
      } catch (apiErr) {
        console.error('[paymob-verify] Intention API call failed:', apiErr)
      }
    }

    // Fallback: return current status
    return new Response(JSON.stringify({
      status: order.paymentStatus || 'PENDING',
      orderId: order.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[paymob-verify] error:', error.message)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
