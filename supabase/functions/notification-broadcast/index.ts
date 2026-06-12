import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_TYPES = ['info', 'order', 'promo', 'system']
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_PUSH_CHUNK = 100

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

function fail(error: string) {
  return new Response(JSON.stringify({ error }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function sendExpoPushBatch(messages: Record<string, unknown>[]) {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN')
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Expo push failed: ${res.status} ${txt}`)
  }
  return res.json() as Promise<{ data?: Array<{ status: string; id?: string; message?: string; details?: { error?: string } }> }>
}

async function pushForUserIds(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  payload: { title: string; body: string; type: string; notifId: string; orderId?: string | null },
) {
  if (!userIds || userIds.length === 0) return { sent: 0, pruned: 0 }

  const { data: tokens, error: tokensErr } = await supabase
    .from('push_tokens')
    .select('id, token, platform, "userId"')
    .in('userId', userIds)

  if (tokensErr) throw tokensErr
  if (!tokens || tokens.length === 0) return { sent: 0, pruned: 0 }

  const chunks: Array<{ token: string; id: string; platform: string }> = []
  for (const t of tokens) {
    chunks.push({ token: t.token, id: t.id, platform: t.platform })
  }

  let sent = 0
  let pruned = 0
  const staleIds: string[] = []

  for (let i = 0; i < chunks.length; i += EXPO_PUSH_CHUNK) {
    const batch = chunks.slice(i, i + EXPO_PUSH_CHUNK)
    const messages = batch.map((b) => ({
      to: b.token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'default',
      data: {
        notifId: payload.notifId,
        type: payload.type,
        orderId: payload.orderId ?? null,
      },
    }))

    try {
      const result = await sendExpoPushBatch(messages)
      const tickets = result.data || []
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent += 1
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          staleIds.push(batch[idx].id)
          pruned += 1
        }
      })
    } catch (e) {
      console.error('Expo push batch error', e)
    }
  }

  if (staleIds.length > 0) {
    await supabase.from('push_tokens').delete().in('id', staleIds)
  }

  return { sent, pruned }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- JWT Verification (C3) ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return fail('Unauthorized - no token provided')
    }

    const authClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) {
      return fail('Unauthorized - invalid token')
    }

    // --- Admin role check (H9) ---
    const { data: profile, error: profileErr } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || profile?.role !== 'ADMIN') {
      return fail('Forbidden - admin access required')
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const { title, titleAr, body, bodyAr, type, targetUserId, orderId } = await req.json()

    if (!title || !body) {
      return fail('Title and body are required')
    }

    if (type && !VALID_TYPES.includes(type)) {
      return fail(`Invalid type "${type}". Must be one of: ${VALID_TYPES.join(', ')}`)
    }

    const baseNotification = {
      title: title || '',
      titleAr: titleAr || title || '',
      body: body || '',
      bodyAr: bodyAr || body || '',
      type: type || 'info',
    }

    const targetUserIds: string[] = []

    if (targetUserId) {
      const { data: inserted, error: insertErr } = await admin
        .from('notifications')
        .insert({ ...baseNotification, userId: targetUserId, orderId: orderId || null })
        .select('id, "userId"')
        .single()
      if (insertErr) return fail(insertErr.message)
      targetUserIds.push(inserted.userId)
    } else {
      const { data: users, error: usersErr } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'CUSTOMER')
      if (usersErr) return fail(usersErr.message)

      if (users && users.length > 0) {
        const rows = users.map((u) => ({ ...baseNotification, userId: u.id, orderId: orderId || null }))
        const { data: inserted, error: insertErr } = await admin
          .from('notifications')
          .insert(rows)
          .select('id, "userId"')
        if (insertErr) return fail(insertErr.message)
        for (const row of inserted || []) targetUserIds.push(row.userId)
      }
    }

    let pushResult: { sent: number; pruned: number } = { sent: 0, pruned: 0 }
    if (targetUserIds.length > 0) {
      try {
        const head = { ...baseNotification }
        pushResult = await pushForUserIds(admin, targetUserIds, {
          title: head.titleAr || head.title,
          body: head.bodyAr || head.body,
          type: head.type,
          notifId: '',
          orderId: orderId || null,
        })
      } catch (e) {
        console.error('push dispatch failed', e)
      }
    }

    return ok({ success: true, targetCount: targetUserIds.length, push: pushResult })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error')
  }
})
