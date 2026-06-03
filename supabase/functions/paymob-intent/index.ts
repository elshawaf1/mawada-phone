import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYMOB_SECRET_KEY = Deno.env.get('PAYMOB_SECRET_KEY')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `${prefix}_${uuid}`
  return `${prefix}_${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function generateOrderNumber(): string {
  return 'MW-' + Math.floor(100000 + Math.random() * 900000)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      amountCents,
      paymentMethod,
      paymentMethodIds,
      cartItems,
      userEmail,
      userFirstName,
      userLastName,
      userPhone,
      subtotal,
      shippingCost,
      discount,
      total,
      couponCode,
      userId,
      addressId,
      branchId,
      deliveryType,
    } = body

    console.log('[EDGE] received cartItems:', JSON.stringify(cartItems))
    console.log('[EDGE] amountCents from client:', amountCents)

    if (!userId) {
      throw new Error('userId is required')
    }

    const orderId = generateId('ord')
    const orderNumber = generateOrderNumber()

    const { data: order, error: dbErr } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        orderNumber,
        userId,
        status: 'PENDING',
        paymentMethod: paymentMethod || 'VISA',
        paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING',
        subtotal: subtotal || 0,
        shippingCost: shippingCost || 0,
        discount: discount || 0,
        total: total || (amountCents ? amountCents / 100 : 0),
        couponCode: couponCode || null,
        addressId: deliveryType === 'delivery' ? (addressId || null) : null,
        branchId: deliveryType === 'branch' ? (branchId || null) : null,
      })
      .select()
      .single()

    if (dbErr) throw new Error(dbErr.message)

    if (cartItems?.length > 0) {
      const orderItems = cartItems.map((item: { productId?: string; variantId?: string; quantity: number; unitPrice: number }) => ({
        id: generateId('oi'),
        orderId: order.id,
        productId: item.productId || null,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
      const { error: oiErr } = await supabase.from('order_items').insert(orderItems)
      if (oiErr) {
        console.error('order_items insert error:', oiErr.message)
      }
    }

    if (paymentMethod === 'COD') {
      return new Response(JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: 'COD',
        paymentStatus: 'UNPAID',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const methods = paymentMethodIds?.length > 0
      ? paymentMethodIds
      : []

    const subtotalCents = (cartItems || []).reduce(
      (sum: number, item: { unitPrice: number; quantity: number }) =>
        sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    )
    const shippingCents = Math.round((shippingCost || 0) * 100)
    const discountCents = Math.round((discount || 0) * 100)
    const totalCents = subtotalCents + shippingCents - discountCents

    let paymentItems: Array<{ name: string; amount: number; description: string; quantity: number }>
    let paymobAmount: number

    if (discountCents > 0) {
      paymentItems = [{
        name: 'Order',
        amount: totalCents,
        description: 'Mawada order',
        quantity: 1,
      }]
      paymobAmount = totalCents
    } else {
      paymentItems = (cartItems || []).map((item: { name?: string; unitPrice: number; quantity: number }) => ({
        name: item.name || 'Product',
        amount: Math.round(item.unitPrice * 100),
        description: item.name || 'Product',
        quantity: item.quantity,
      }))
      if (shippingCents > 0) {
        paymentItems.push({
          name: 'Shipping',
          amount: shippingCents,
          description: 'Shipping',
          quantity: 1,
        })
      }
      paymobAmount = paymentItems.reduce((s, i) => s + i.amount * i.quantity, 0)
    }

    console.log('[EDGE] subtotalCents:', subtotalCents, 'shippingCents:', shippingCents, 'discountCents:', discountCents, 'totalCents:', totalCents)
    console.log('[EDGE] paymobAmount:', paymobAmount, 'paymentItems:', JSON.stringify(paymentItems))

    const paymobPayload: Record<string, unknown> = {
      amount: paymobAmount,
      currency: 'EGP',
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
    }

    if (methods.length > 0) {
      paymobPayload.payment_methods = methods
    }

    const response = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      },
      body: JSON.stringify(paymobPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      const detail = data.detail || data.message || JSON.stringify(data)
      throw new Error(`Paymob API error (${response.status}): ${detail}`)
    }

    const paymobOrderId = String(data.intention_order_id)

    const updateFields: Record<string, unknown> = { paymobOrderId }

    if (data.payment_keys?.[0]?.key) {
      updateFields.fawryCode = data.payment_keys[0].key
    }

    await supabase
      .from('orders')
      .update(updateFields)
      .eq('id', order.id)

    return new Response(JSON.stringify({
      clientSecret: data.client_secret,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymobOrderId,
      fawryCode: data.payment_keys?.[0]?.key || null,
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
