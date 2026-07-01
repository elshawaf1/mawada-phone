import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const { userId, title, body, type, orderId, notifId } = await req.json()

    if (!userId || !title || !body) {
      return fail('userId, title, and body are required')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: tokens, error: tokensErr } = await supabase
      .from('push_tokens')
      .select('id, token, platform')
      .eq('userId', userId)

    if (tokensErr) throw tokensErr
    if (!tokens || tokens.length === 0) return ok({ sent: 0, pruned: 0, reason: 'no_tokens' })

    let sent = 0
    let pruned = 0
    const staleIds: string[] = []

    for (const t of tokens) {
      const messages = [{
        to: t.token,
        title,
        body,
        sound: 'default',
        channelId: 'default',
        data: {
          notifId: notifId || '',
          type: type || 'info',
          orderId: orderId || null,
        },
      }]

      try {
        const result = await sendExpoPushBatch(messages)
        const tickets = result.data || []
        tickets.forEach((ticket) => {
          if (ticket.status === 'ok') {
            sent += 1
          } else if (ticket.details?.error === 'DeviceNotRegistered') {
            staleIds.push(t.id)
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

    return ok({ sent, pruned })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error')
  }
})
