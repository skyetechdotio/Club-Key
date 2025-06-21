import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessPayoutRequest {
  bookingId: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { bookingId }: ProcessPayoutRequest = await req.json()

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: bookingId' }),
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

    // Initialize Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get booking details with host information
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        tee_time:tee_time_id (
          *,
          host:host_id (
            id,
            stripe_connect_id,
            first_name,
            last_name,
            username
          )
        )
      `)
      .eq('id', bookingId)
      .eq('status', 'confirmed')
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found or not confirmed' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const host = booking.tee_time?.host as any
    if (!host?.stripe_connect_id) {
      return new Response(
        JSON.stringify({ error: 'Host has not connected their Stripe account' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if payout has already been processed
    const { data: existingPayout } = await supabaseClient
      .from('payouts')
      .select('*')
      .eq('booking_id', bookingId)
      .single()

    if (existingPayout) {
      return new Response(
        JSON.stringify({ 
          error: 'Payout already processed',
          payout_id: existingPayout.stripe_transfer_id 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get payment intent metadata for pricing
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
    const metadata = paymentIntent.metadata

    const hostTotalPrice = parseFloat(metadata.host_price_per_player) * parseInt(metadata.number_of_players)
    const platformFee = parseFloat(metadata.platform_fee)
    const hostPayoutAmount = hostTotalPrice - platformFee

    // Convert to cents for Stripe
    const hostPayoutAmountCents = Math.round(hostPayoutAmount * 100)

    // Create transfer to host
    const transfer = await stripe.transfers.create({
      amount: hostPayoutAmountCents,
      currency: 'usd',
      destination: host.stripe_connect_id,
      metadata: {
        booking_id: bookingId.toString(),
        tee_time_id: metadata.tee_time_id,
        host_id: host.id,
        platform_fee: platformFee.toString(),
        payout_type: 'host_payout',
        platform: 'clubkey'
      },
      description: `Payout for booking #${bookingId} - ${metadata.club_name}`,
    })

    // Record payout in database
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payouts')
      .insert({
        booking_id: bookingId,
        host_id: host.id,
        stripe_transfer_id: transfer.id,
        amount: hostPayoutAmount,
        platform_fee: platformFee,
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating payout record:', payoutError)
      return new Response(
        JSON.stringify({ error: 'Failed to record payout in database' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update booking status to indicate payout completed
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ 
        status: 'payout_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (updateError) {
      console.warn('Failed to update booking status to payout_completed:', updateError)
      // Don't fail the request for this, but log the warning
    }

    return new Response(
      JSON.stringify({
        transfer_id: transfer.id,
        payout_id: payout.id,
        host_payout_amount: hostPayoutAmount,
        platform_fee: platformFee,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in process-host-payout:', error)
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