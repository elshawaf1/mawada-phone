import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYMOB_SECRET_KEY = Deno.env.get('PAYMOB_SECRET_KEY')!
const INTEGRATION_ID = Number(Deno.env.get('PAYMOB_INTEGRATION_ID')!)
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
    const {
      amountCents, userEmail, userFirstName, userLastName, userPhone,
      items, cartItems, subtotal, shippingCost, discount, total, couponCode,
      userId, addressId, branchId, deliveryType,
    } = await req.json()

    if (!amountCents || amountCents <= 0) {
      throw new Error('Invalid amount')
    }
    if (!userId) {
      throw new Error('userId is required')
    }

    const orderNumber = 'MW-' + Math.floor(100000 + Math.random() * 900000)

    const orderId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: order, error: dbErr } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        orderNumber,
        userId,
        status: 'PENDING',
        paymentMethod: 'VISA',
        paymentStatus: 'PENDING',
        subtotal: subtotal || 0,
        shippingCost: shippingCost || 0,
        discount: discount || 0,
        total: total || amountCents / 100,
        couponCode: couponCode || null,
        addressId: addressId || null,
        branchId: branchId || null,
      })
      .select()
      .single()

    if (dbErr) throw new Error(dbErr.message)

    if (cartItems?.length > 0) {
      const orderItems = cartItems.map((item: { productId: string; variantId: string; quantity: number; unitPrice: number }) => ({
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        orderId: order.id,
        productId: item.productId || null,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
      const { error: oiErr } = await supabase.from('order_items').insert(orderItems)
      if (oiErr) console.error('order_items insert error:', oiErr.message)
    }

    const paymentItems = items?.length > 0
      ? items.map((item: { name: string; amount: number }) => ({
          name: item.name || 'Product',
          amount: item.amount,
          description: item.name || 'Product',
          quantity: 1,
        }))
      : [{ name: 'Order', amount: amountCents, description: 'Mawada order', quantity: 1 }]

    const response = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'EGP',
        payment_methods: [INTEGRATION_ID],
        items: paymentItems,
        billing_data: {
          apartment: 'NA',
          first_name: userFirstName || 'Customer',
          last_name: userLastName || 'User',
          street: 'NA',
          building: 'NA',
          phone_number: userPhone || '+201000000000',
          city: 'Cairo',
          country: 'EG',
          email: userEmail || 'customer@example.com',
          floor: 'NA',
          state: 'Cairo',
        },
        extras: { merchant_order_id: order.id },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const detail = data.detail || data.message || JSON.stringify(data)
      throw new Error(`Paymob API error (${response.status}): ${detail}`)
    }

    await supabase
      .from('orders')
      .update({ paymobOrderId: String(data.intention_order_id) })
      .eq('id', order.id)

    return new Response(JSON.stringify({
      clientSecret: data.client_secret,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymobOrderId: data.intention_order_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('paymob-intent error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
