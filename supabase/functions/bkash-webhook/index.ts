import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BkashWebhookPayload {
  trxID?: string;
  transactionId?: string;
  amount?: string | number;
  customerCode?: string;
  reference?: string;
  sender?: string;
  receiver?: string;
  tenantId?: string;
  paymentType?: 'personal' | 'merchant' | 'tokenized' | 'checkout';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: BkashWebhookPayload = await req.json();
    console.log('Received bKash webhook:', JSON.stringify(payload));

    const trxId = payload.trxID || payload.transactionId || '';
    const amount = parseFloat(String(payload.amount || 0));
    const customerCode = payload.customerCode || payload.reference || '';
    const tenantId = payload.tenantId || '';
    const paymentType = payload.paymentType || 'webhook_personal';

    if (!trxId || amount <= 0) {
      console.error('Invalid payload: missing trxID or amount');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate transaction
    const { data: existing } = await supabase
      .from('bkash_payments')
      .select('id')
      .eq('trx_id', trxId)
      .single();

    if (existing) {
      console.log('Duplicate transaction:', trxId);
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the payment
    const { data: bkashPayment, error: insertError } = await supabase
      .from('bkash_payments')
      .insert({
        tenant_id: tenantId || null,
        trx_id: trxId,
        amount,
        customer_code: customerCode,
        sender_number: payload.sender,
        receiver_number: payload.receiver,
        payment_type: paymentType,
        status: 'pending',
        raw_payload: payload,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting bkash payment:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to match with customer if customer_code is provided
    if (customerCode && tenantId) {
      const { data: matchResult, error: matchError } = await supabase
        .rpc('match_bkash_payment', {
          _trx_id: trxId,
          _amount: amount,
          _customer_code: customerCode,
          _tenant_id: tenantId,
        });

      if (matchError) {
        console.error('Error matching payment:', matchError);
      } else if (matchResult?.success) {
        // Update bkash_payments with matched customer
        await supabase
          .from('bkash_payments')
          .update({
            customer_id: matchResult.customer_id,
            status: 'completed',
            matched_at: new Date().toISOString(),
          })
          .eq('id', bkashPayment.id);

        console.log('Payment matched:', matchResult);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Payment matched and applied',
            customer: matchResult.customer_name,
            newDue: matchResult.new_due,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Payment recorded but not matched
    console.log('Payment recorded, pending manual matching');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment recorded, pending manual matching',
        paymentId: bkashPayment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});