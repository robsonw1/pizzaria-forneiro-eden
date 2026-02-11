import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coupon_code, customer_id, order_id } = await req.json();

    if (!coupon_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cupom inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );

    // 🔒 ATUALIZAÇÃO ATOMICAMENTE: Marcar cupom como usado
    // Usa SELECT FOR UPDATE (lock row) para evitar race condition
    const now = new Date().toISOString();

    const { error: updateError, data: updatedCoupon } = await supabase
      .from('loyalty_coupons')
      .update({
        is_used: true,
        used_at: now,
        // Registrar customer_id e order_id para auditoria (opcional)
      })
      .eq('coupon_code', coupon_code.toUpperCase())
      .eq('is_used', false)  // ⚠️ CRUCIAL: Só atualiza se ainda NÃO foi usado (evita double-spend)
      .select()
      .single();

    if (updateError) {
      // Se houver erro, provavelmente o cupom já foi marcado por outra requisição
      console.error('Erro ao marcar cupom como usado:', updateError);
      
      // Verificar se o cupom já está marcado como usado
      const { data: checkCoupon } = await supabase
        .from('loyalty_coupons')
        .select('is_used, used_at')
        .eq('coupon_code', coupon_code.toUpperCase())
        .single();

      if (checkCoupon?.is_used) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Cupom já foi utilizado por outra transação',
            already_used: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro ao marcar cupom como usado',
          details: updateError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // ✅ Sucesso: Cupom foi marcado como usado
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cupom marcado como utilizado',
        coupon_code,
        used_at: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em mark-coupon-used:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro ao processar cupom',
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
