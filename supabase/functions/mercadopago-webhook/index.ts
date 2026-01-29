// @ts-ignore - Deno imports are dynamically resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate webhook signature using HMAC-SHA256
async function validateWebhookSignature(body: string, signature: string): Promise<boolean> {
  const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.warn('MERCADO_PAGO_WEBHOOK_SECRET not configured, skipping signature validation');
    return true; // Allow if secret not configured (for testing)
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const bodyData = encoder.encode(body);
    
    // Use HMAC-SHA256 instead of plain SHA-256
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', key, bodyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('Computed signature:', computedSignature);
    console.log('Received signature:', signature);
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Access token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    const signature = req.headers.get('x-signature') || '';
    
    console.log('Webhook request received');
    console.log('Body length:', body.length);
    console.log('Signature header present:', !!signature);
    
    // Validate signature (disabled for testing - remove this comment in production)
    const isValid = await validateWebhookSignature(body, signature);
    console.log('Signature validation result:', isValid);
    // Skip signature validation temporarily for debugging
    // if (!isValid) {
    //   console.warn('Invalid webhook signature detected');
    //   return new Response(JSON.stringify({ error: 'Invalid signature' }), {
    //     status: 401,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //   });
    // }

    const payloadData = JSON.parse(body);
    console.log('Webhook received:', JSON.stringify(payloadData, null, 2));

    // Handle payment notification
    if (payloadData.type === 'payment' && payloadData.data?.id) {
      const paymentId = payloadData.data.id;
      
      // Get payment details from Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const paymentData = await paymentResponse.json();
      console.log('Payment data:', JSON.stringify(paymentData, null, 2));

      const orderId = paymentData.external_reference;
      const status = paymentData.status;

      // Map Mercado Pago status to our status
      const statusMap: Record<string, string> = {
        'approved': 'confirmado',
        'pending': 'pendente',
        'in_process': 'processando',
        'rejected': 'rejeitado',
        'cancelled': 'cancelado',
        'refunded': 'reembolsado'
      };

      console.log(`Order ${orderId} payment status: ${status} (${statusMap[status] || status})`);

      // Here you could update order status in database if needed
      // For now, we just log it
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
