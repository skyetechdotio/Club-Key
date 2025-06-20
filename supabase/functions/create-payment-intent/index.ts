import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePaymentIntentRequest {
  teeTimeId: number
  numberOfPlayers: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { teeTimeId, numberOfPlayers }: CreatePaymentIntentRequest = await req.json()

    if (!teeTimeId || !numberOfPlayers) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: teeTimeId, numberOfPlayers' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

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

    // Get tee time details and host information
    const { data: teeTime, error: teeTimeError } = await supabaseClient
      .from('tee_time_listings')
      .select(`
        *,
        host:host_id (
          id,
          stripe_connect_id,
          first_name,
          last_name,
          username
        ),
        clubs (
          id,
          name,
          location
        )
      `)
      .eq('id', teeTimeId)
      .eq('status', 'available')
      .single()

    if (teeTimeError || !teeTime) {
      return new Response(
        JSON.stringify({ error: 'Tee time not found or not available' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const host = teeTime.host as any
    if (!host?.stripe_connect_id) {
      return new Response(
        JSON.stringify({ error: 'Host has not connected their Stripe account' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Calculate pricing
    const hostPricePerPlayer = teeTime.price
    const hostTotalPrice = hostPricePerPlayer * numberOfPlayers
    
    // Guest fee: 5% of host price
    const guestFee = Math.round(hostTotalPrice * 0.05 * 100) / 100
    
    // Total amount guest pays (host price + guest fee)
    const totalAmount = hostTotalPrice + guestFee
    
    // Application fee: 10% of host price (host fee) + 5% of host price (guest fee) = 15% total
    const applicationFee = Math.round(hostTotalPrice * 0.15 * 100) / 100

    // Convert to cents for Stripe
    const totalAmountCents = Math.round(totalAmount * 100)
    const applicationFeeCents = Math.round(applicationFee * 100)

    // Create PaymentIntent with manual capture for escrow
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      capture_method: 'manual', // This enables escrow - payment is authorized but not captured
      application_fee_amount: applicationFeeCents,
      transfer_data: {
        destination: host.stripe_connect_id,
      },
      metadata: {
        tee_time_id: teeTimeId.toString(),
        guest_id: user.id,
        number_of_players: numberOfPlayers.toString(),
        host_id: host.id,
        club_name: teeTime.clubs?.name || 'Unknown Club',
        host_price_per_player: hostPricePerPlayer.toString(),
        guest_fee: guestFee.toString(),
        application_fee: applicationFee.toString(),
        platform: 'clubkey'
      },
      description: `Tee time at ${teeTime.clubs?.name || 'Golf Club'} - ${numberOfPlayers} player(s)`,
    })

    // Create initial booking record with payment pending status
    const totalPrice = totalAmount
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        tee_time_id: teeTimeId,
        guest_id: user.id,
        number_of_players: numberOfPlayers,
        total_price: totalPrice,
        status: 'payment_pending',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      
      // Cancel the payment intent if booking creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to create booking record' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update tee time status to pending payment
    const { error: updateError } = await supabaseClient
      .from('tee_time_listings')
      .update({ status: 'pending_payment' })
      .eq('id', teeTimeId)

    if (updateError) {
      console.warn('Failed to update tee time status to pending_payment:', updateError)
      // Don't fail the request for this, but log the warning
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        booking_id: booking.id,
        amount: totalAmount,
        host_amount: hostTotalPrice,
        guest_fee: guestFee,
        application_fee: applicationFee,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in create-payment-intent:', error)
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