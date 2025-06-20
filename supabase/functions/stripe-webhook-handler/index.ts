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

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the raw body for signature verification
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check for idempotency - ensure we don't process the same event twice
    const { data: existingEvent } = await supabaseClient
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping`)
      return new Response(
        JSON.stringify({ received: true, message: 'Event already processed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log the event for idempotency
    const { error: logError } = await supabaseClient
      .from('webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        data: event.data
      })

    if (logError) {
      console.error('Failed to log webhook event:', logError)
      // Continue processing even if logging fails
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabaseClient)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, supabaseClient)
        break
      
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, supabaseClient)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in stripe-webhook-handler:', error)
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

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabaseClient: any) {
  console.log(`Processing payment_intent.succeeded: ${paymentIntent.id}`)

  // Find the booking associated with this payment intent
  const { data: booking, error: bookingError } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (bookingError || !booking) {
    console.error('Booking not found for payment intent:', paymentIntent.id)
    return
  }

  // Update booking status to confirmed
  const { error: updateBookingError } = await supabaseClient
    .from('bookings')
    .update({ 
      status: 'confirmed',
      completed_at: new Date().toISOString()
    })
    .eq('id', booking.id)

  if (updateBookingError) {
    console.error('Failed to update booking status:', updateBookingError)
    return
  }

  // Update tee time listing status to booked
  const { error: updateTeeTimeError } = await supabaseClient
    .from('tee_time_listings')
    .update({ status: 'booked' })
    .eq('id', booking.tee_time_id)

  if (updateTeeTimeError) {
    console.error('Failed to update tee time status:', updateTeeTimeError)
    return
  }

  console.log(`Successfully processed payment success for booking ${booking.id}`)

  // TODO: Send confirmation notifications to guest and host
  // TODO: Create calendar events
  // TODO: Send confirmation emails
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabaseClient: any) {
  console.log(`Processing payment_intent.payment_failed: ${paymentIntent.id}`)

  // Find the booking associated with this payment intent
  const { data: booking, error: bookingError } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (bookingError || !booking) {
    console.error('Booking not found for payment intent:', paymentIntent.id)
    return
  }

  // Update booking status to payment_failed
  const { error: updateBookingError } = await supabaseClient
    .from('bookings')
    .update({ status: 'payment_failed' })
    .eq('id', booking.id)

  if (updateBookingError) {
    console.error('Failed to update booking status:', updateBookingError)
    return
  }

  // Revert tee time listing status back to available
  const { error: updateTeeTimeError } = await supabaseClient
    .from('tee_time_listings')
    .update({ status: 'available' })
    .eq('id', booking.tee_time_id)

  if (updateTeeTimeError) {
    console.error('Failed to revert tee time status:', updateTeeTimeError)
    return
  }

  console.log(`Successfully processed payment failure for booking ${booking.id}`)

  // TODO: Send notification to guest about payment failure
  // TODO: Optionally notify host about failed booking
}

async function handleChargeRefunded(charge: Stripe.Charge, supabaseClient: any) {
  console.log(`Processing charge.refunded: ${charge.id}`)

  // Find the booking associated with this charge's payment intent
  const { data: booking, error: bookingError } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('stripe_payment_intent_id', charge.payment_intent)
    .single()

  if (bookingError || !booking) {
    console.error('Booking not found for charge:', charge.id)
    return
  }

  // Update booking status to refunded
  const { error: updateBookingError } = await supabaseClient
    .from('bookings')
    .update({ status: 'refunded' })
    .eq('id', booking.id)

  if (updateBookingError) {
    console.error('Failed to update booking status:', updateBookingError)
    return
  }

  // Make tee time available again if it was booked
  const { error: updateTeeTimeError } = await supabaseClient
    .from('tee_time_listings')
    .update({ status: 'available' })
    .eq('id', booking.tee_time_id)

  if (updateTeeTimeError) {
    console.error('Failed to update tee time status after refund:', updateTeeTimeError)
    return
  }

  console.log(`Successfully processed refund for booking ${booking.id}`)

  // TODO: Send refund confirmation notifications
}