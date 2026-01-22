import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    const body = await req.json();
    const { 
      orderId,
      amount, 
      description, 
      payerEmail,
      payerName,
      payerPhone,
      payerCpf,
      items,
      paymentType // 'pix' or 'preference'
    } = body;

    // If paymentType is 'pix', create a PIX payment directly
    if (paymentType === 'pix') {
      // Clean CPF - remove non-digits
      const cleanCpf = payerCpf?.replace(/\D/g, '') || '';
      
      const pixPayment = {
        transaction_amount: Number(amount.toFixed(2)),
        description: description || `Pedido ${orderId}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail || 'cliente@email.com',
          first_name: payerName?.split(' ')[0] || 'Cliente',
          last_name: payerName?.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: cleanCpf
          }
        },
        external_reference: orderId,
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
      };

      console.log('Creating PIX payment:', JSON.stringify(pixPayment, null, 2));

      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': orderId
        },
        body: JSON.stringify(pixPayment)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Mercado Pago PIX error:', data);
        throw new Error(data.message || 'Failed to create PIX payment');
      }

      console.log('PIX payment created:', data.id);

      // Return PIX data
      return new Response(JSON.stringify({
        paymentId: data.id,
        status: data.status,
        qrCode: data.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: data.point_of_interaction?.transaction_data?.ticket_url,
        expirationDate: data.date_of_expiration
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default: Create checkout preference for redirect
    const preference = {
      items: items.map((item: any) => ({
        id: item.id || orderId,
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price.toFixed(2)),
        currency_id: 'BRL'
      })),
      payer: {
        email: payerEmail || 'cliente@email.com',
        name: payerName,
        phone: {
          number: payerPhone?.replace(/\D/g, '') || ''
        }
      },
      external_reference: orderId,
      back_urls: {
        success: `${req.headers.get('origin') || 'https://localhost:3000'}/?status=approved&order=${orderId}`,
        failure: `${req.headers.get('origin') || 'https://localhost:3000'}/?status=rejected&order=${orderId}`,
        pending: `${req.headers.get('origin') || 'https://localhost:3000'}/?status=pending&order=${orderId}`
      },
      auto_return: 'approved',
      statement_descriptor: 'FORNEIRO EDEN',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
    };

    console.log('Creating Mercado Pago preference:', JSON.stringify(preference, null, 2));

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago error:', data);
      throw new Error(data.message || 'Failed to create payment preference');
    }

    console.log('Preference created:', data.id);

    return new Response(JSON.stringify({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
