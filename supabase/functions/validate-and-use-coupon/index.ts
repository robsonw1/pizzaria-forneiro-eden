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
    const { coupon_code, customer_id } = await req.json();

    if (!coupon_code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Cupom inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );

    // 🔒 Usar SELECT para validação (sem lock, apenas leitura)
    const { data: coupon, error: fetchError } = await supabase
      .from('loyalty_coupons')
      .select('*')
      .eq('coupon_code', coupon_code.toUpperCase())
      .single();

    if (fetchError || !coupon) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          discount: 0,
          message: 'Cupom inválido',
          code: 'INVALID_COUPON'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Validação 1: Verificar se está ativo
    if (!coupon.is_active) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          discount: 0,
          message: 'Cupom desativado',
          code: 'COUPON_INACTIVE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Validação 2: Verificar se já foi usado
    if (coupon.is_used) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          discount: 0,
          message: 'Cupom já foi utilizado',
          code: 'COUPON_USED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Validação 3: Verificar validade
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          discount: 0,
          message: 'Cupom expirado',
          code: 'COUPON_EXPIRED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ SUCESSO: Cupom é válido
    // Nota: NÃO marca como usado aqui! Isso é feito apenas quando o pedido é confirmado
    return new Response(
      JSON.stringify({ 
        valid: true, 
        discount: coupon.discount_percentage || 0,
        message: `Cupom válido! ${coupon.discount_percentage || 0}% de desconto`,
        code: 'COUPON_VALID',
        coupon_id: coupon.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em validate-and-use-coupon:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Erro ao validar cupom',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
