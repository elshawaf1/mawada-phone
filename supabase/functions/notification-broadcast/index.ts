import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) throw new Error('Unauthorized')

    const { data: profile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') throw new Error('Admin only')

    const { title, titleAr, body, bodyAr, type, targetUserId } = await req.json()

    if (!title || !body) {
      throw new Error('Title and body are required')
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const baseNotification = {
      title: title || '',
      titleAr: titleAr || title || '',
      body: body || '',
      bodyAr: bodyAr || body || '',
      type: type || 'info',
      sentBy: user.id,
    }

    if (targetUserId) {
      const { error: insertErr } = await adminClient
        .from('notifications')
        .insert({ ...baseNotification, userId: targetUserId })
      if (insertErr) throw new Error(insertErr.message)
    } else {
      const { data: users, error: usersErr } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'CUSTOMER')

      if (usersErr) throw new Error(usersErr.message)

      if (users && users.length > 0) {
        const notifications = users.map(u => ({
          ...baseNotification,
          userId: u.id,
        }))

        const { error: insertErr } = await adminClient
          .from('notifications')
          .insert(notifications)
        if (insertErr) throw new Error(insertErr.message)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
