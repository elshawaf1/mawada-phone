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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') throw new Error('Admin only')

    const { title, titleAr, body, bodyAr, type, targetUserId } = await req.json()

    if (!title || !body) {
      throw new Error('Title and body are required')
    }

    if (targetUserId) {
      await supabaseClient
        .from('notifications')
        .insert({
          userId: targetUserId,
          title: title || '',
          titleAr: titleAr || title || '',
          body: body || '',
          bodyAr: bodyAr || body || '',
          type: type || 'info',
        })
    } else {
      const { data: users } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'CUSTOMER')

      if (users && users.length > 0) {
        const notifications = users.map(u => ({
          userId: u.id,
          title: title || '',
          titleAr: titleAr || title || '',
          body: body || '',
          bodyAr: bodyAr || body || '',
          type: type || 'info',
        }))

        await supabaseClient
          .from('notifications')
          .insert(notifications)
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
