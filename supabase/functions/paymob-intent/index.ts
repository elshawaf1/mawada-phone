import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYMOB_SECRET_KEY = Deno.env.get('PAYMOB_SECRET_KEY')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `${prefix}_${uuid}`
  return `${prefix}_${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function fail(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- JWT Verification (C2) ---
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return fail('Unauthorized - no token provided', 401)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return fail('Unauthorized - invalid token', 401)
    }

    // --- Input Validation & Parsing ---
    const body = await req.json()
    const {
      paymentMethod,
      paymentMethodIds,
      cartItems,
      userEmail,
      userFirstName,
      userLastName,
      userPhone,
      couponCode,
      addressId,
      branchId,
      deliveryType,
      notes,
      existingOrderId,
      existingOrderNumber,
      idempotencyKey,
    } = body

    const userId = user.id

    // --- Idempotency Check ---
    if (idempotencyKey) {
      const { data: existingKey } = await supabase
        .from('payment_idempotency_keys')
        .select('"orderId"')
        .eq('key', idempotencyKey)
        .maybeSingle()
      if (existingKey) {
        return new Response(JSON.stringify({
          orderId: existingKey.orderId,
          status: 'duplicate',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }
    }

    if (!paymentMethod || !['VISA', 'WALLET', 'COD'].includes(paymentMethod)) {
      return fail('Invalid payment method')
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return fail('Cart must contain at least one item')
    }
    for (const item of cartItems) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
        return fail('Each cart item must have a valid productId and quantity >= 1')
      }
    }

    let order: any
    let orderItemsForPaymob: Array<{ name: string; unitPrice: number; quantity: number }> = []

    // --- Handle existing order (resume payment) ---
    let existing: any = null
    if (existingOrderNumber) {
      const res = await supabase
        .from('orders')
        .select('id, orderNumber, userId, status, paymentStatus, subtotal, shippingCost, discount, total, couponCode')
        .eq('orderNumber', existingOrderNumber)
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (res.error) console.error('Order lookup error:', res.error.message)
      existing = res.data
    } else if (existingOrderId) {
      const res = await supabase
        .from('orders')
        .select('id, orderNumber, userId, status, paymentStatus, subtotal, shippingCost, discount, total, couponCode')
        .eq('id', existingOrderId)
        .maybeSingle()
      if (res.error) console.error('Order lookup error:', res.error.message)
      existing = res.data
    }

    if (existing) {
      if (existing.userId !== userId) {
        return fail('Forbidden', 403)
      }
      if (existing.status !== 'PENDING') {
        return fail('Order is no longer payable')
      }
      if (!['PENDING', 'FAILED'].includes(existing.paymentStatus)) {
        return fail(`Order is already ${existing.paymentStatus}`)
      }
      order = existing

      if (paymentMethod === 'COD') {
        const { error: updateErr } = await supabase
          .from('orders')
          .update({ paymentMethod: 'COD', paymentStatus: 'UNPAID' })
          .eq('id', order.id)
        if (updateErr) throw new Error('Failed to update order')
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

      const { data: oi, error: oiErr } = await supabase
        .from('order_items')
        .select('quantity, unitPrice, products(nameAr, name)')
        .eq('orderId', existing.id)

      if (oiErr) {
        console.error('order_items fetch error:', oiErr.message)
      } else {
        orderItemsForPaymob = (oi || []).map((it: any) => ({
          name: it.products?.nameAr || it.products?.name || 'Product',
          unitPrice: Number(it.unitPrice),
          quantity: it.quantity,
        }))
      }
    } else {
      // --- Server-side price calculation (C1) ---
      const productIds = cartItems.map((item: { productId: string }) => item.productId)
      const variantIds = cartItems.filter((i: any) => i.variantId).map((i: any) => i.variantId)

      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, basePrice, nameAr, name, totalStock')
        .in('id', productIds)

      let variantMap = new Map()
      if (variantIds.length > 0) {
        const { data: variants } = await supabase
          .from('product_variants')
          .select('id, price, productId, stock')
          .in('id', variantIds)
        if (variants) {
          variantMap = new Map(variants.map((v: any) => [v.id, v]))
        }
      }

      if (prodErr || !products || products.length === 0) {
        return fail('Could not verify product prices')
      }

      const productMap = new Map(products.map((p: any) => [p.id, p]))

      let subtotal = 0
      for (const item of cartItems) {
        const product = productMap.get(item.productId)
        if (!product) {
          return fail(`Product ${item.productId} not found`)
        }

        // Use variant price if variantId provided, otherwise basePrice
        let unitPrice = Number(product.basePrice)
        let availableStock = product.totalStock

        if (item.variantId && variantMap.has(item.variantId)) {
          const variant = variantMap.get(item.variantId)
          unitPrice = Number(variant.price)
          availableStock = variant.stock ?? 0
        }

        if (availableStock < item.quantity) {
          return fail(`Insufficient stock for ${product.nameAr || product.name}`)
        }
        subtotal += unitPrice * item.quantity
      }

      let discount = 0
      if (couponCode) {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('"discountPercent", "maxUses", "currentUses", "minOrderAmount", "expiresAt", "isActive"')
          .eq('code', couponCode.toUpperCase())
          .maybeSingle()

        if (coupon && coupon.isActive) {
          if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            discount = 0
          } else if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
            discount = 0
          } else if (subtotal < (coupon.minOrderAmount || 0)) {
            discount = 0
          } else {
            discount = Math.round(subtotal * (coupon.discountPercent / 100))
          }
        }
      }

      const freeShipping = subtotal > 50000
      const shippingCost = deliveryType === 'branch' ? 0 : (freeShipping ? 0 : 90)
      const total = subtotal - discount + shippingCost

      const orderId = generateId('ord')

      const { data: created, error: dbErr } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          userId,
          status: 'PENDING',
          paymentMethod: paymentMethod || 'VISA',
          paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING',
          subtotal,
          shippingCost,
          discount,
          total,
          couponCode: couponCode || null,
          notes: notes || null,
          addressId: deliveryType === 'delivery' ? (addressId || null) : null,
          branchId: deliveryType === 'branch' ? (branchId || null) : null,
        })
        .select()
        .single()

      if (dbErr) throw new Error('Failed to create order')
      order = created

      if (idempotencyKey) {
        const { error: ikErr } = await supabase
          .from('payment_idempotency_keys')
          .insert({ key: idempotencyKey, orderId: order.id, userId })
        if (ikErr) console.error('idempotency key insert error:', ikErr.message)
      }

      if (cartItems?.length > 0) {
        const orderItems = cartItems.map((item: { productId?: string; variantId?: string; quantity: number }) => {
          let unitPrice = Number(productMap.get(item.productId)?.basePrice || 0)
          if (item.variantId && variantMap.has(item.variantId)) {
            unitPrice = Number(variantMap.get(item.variantId).price)
          }
          return {
            id: generateId('oi'),
            orderId: order.id,
            productId: item.productId || null,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice,
          }
        })
        const { error: oiErr } = await supabase.from('order_items').insert(orderItems)
        if (oiErr) {
          console.error('order_items insert error:', oiErr.message)
        }

        orderItemsForPaymob = cartItems.map((item: { productId: string; variantId?: string; quantity: number }) => {
          const p = productMap.get(item.productId)
          let unitPrice = Number(p?.basePrice || 0)
          if (item.variantId && variantMap.has(item.variantId)) {
            unitPrice = Number(variantMap.get(item.variantId).price)
          }
          return {
            name: p?.nameAr || p?.name || 'Product',
            unitPrice,
            quantity: item.quantity,
          }
        })
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
    }

    const methods = paymentMethodIds?.length > 0 ? paymentMethodIds : []
    const shippingCents = Math.round(Number(order.shippingCost || 0) * 100)
    const discountCents = Math.round(Number(order.discount || 0) * 100)
    const totalCents = Math.round(Number(order.total) * 100)

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
      paymentItems = orderItemsForPaymob.map((item) => ({
        name: item.name,
        amount: Math.round(item.unitPrice * 100),
        description: item.name,
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
      console.error('Paymob API error:', response.status, JSON.stringify(data))
      throw new Error('Payment provider error')
    }

    return new Response(JSON.stringify({
      clientSecret: data.client_secret,
      orderId: order.id,
      orderNumber: order.orderNumber,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('paymob-intent error:', error.message)
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
