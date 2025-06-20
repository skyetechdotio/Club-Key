import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user profile to check if they're a host and get current stripe_connect_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_connect_id, is_host, first_name, last_name, username')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!profile.is_host) {
      return new Response(
        JSON.stringify({ error: 'User is not a host' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let stripeAccountId = profile.stripe_connect_id
    let accountLink

    // If user doesn't have a Stripe Connect account, create one
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // TODO: Make this configurable based on user location
        email: user.email,
        business_profile: {
          name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.username || 'ClubKey Host',
          product_description: 'Golf tee time hosting services',
        },
        metadata: {
          user_id: user.id,
          platform: 'clubkey'
        }
      })

      stripeAccountId = account.id

      // Save the stripe_connect_id to the user's profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_connect_id: stripeAccountId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile with stripe_connect_id:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to save Stripe account ID' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Create account link for onboarding or dashboard access
    const baseUrl = req.headers.get('origin') || 'http://localhost:5173'
    
    accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard?stripe_refresh=true`,
      return_url: `${baseUrl}/dashboard?stripe_success=true`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        account_id: stripeAccountId,
        account_link: accountLink.url,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in create-stripe-connect-account:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})