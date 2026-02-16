import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateQRRequest {
  instance_name: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as GenerateQRRequest;
    const { instance_name } = body;

    console.log(`🔐 [GENERATE-QR] ${instance_name}`);

    if (!instance_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing instance_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!evolutionUrl || !evolutionKey) {
      console.error('Evolution credentials not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Evolution API not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter QR code da Evolution API
    const qrUrl = `${evolutionUrl.replace(/\/$/, '')}/instance/fetchInstances/${instance_name}`;
    
    console.log(`📱 [EVOLUTION] Fetching QR from: ${qrUrl}`);

    const response = await fetch(qrUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: data.message || 'Failed to fetch QR code' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair QR code da resposta
    let qrCode = null;
    
    // A resposta pode conter o QR code em diferentes formatos
    // Verificar várias possibilidades
    if (data.qrcode) {
      qrCode = data.qrcode;
    } else if (data.qr) {
      qrCode = data.qr;
    } else if (Array.isArray(data) && data.length > 0) {
      // Se for um array de instâncias, pegar a primeira
      const instance = data[0];
      if (instance.qrcode) {
        qrCode = instance.qrcode;
      } else if (instance.qr) {
        qrCode = instance.qr;
      }
    }

    if (!qrCode) {
      console.warn('No QR code found in Evolution response:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Instance not ready - try again in a few seconds',
          raw_response: data,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter para base64 se necessário
    let qrCodeBase64 = qrCode;
    if (!qrCode.startsWith('data:image')) {
      // Assumir que é SVG e converter para data URL
      if (qrCode.includes('<svg')) {
        qrCodeBase64 = `data:image/svg+xml;base64,${btoa(qrCode)}`;
      } else if (qrCode.includes('iVBORw0KGgo')) {
        // Já é base64 de imagem
        qrCodeBase64 = `data:image/png;base64,${qrCode}`;
      }
    }

    console.log(`✅ [GENERATE-QR] QR code generated for ${instance_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        qr_code: qrCodeBase64,
        message: 'QR code generated successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ [GENERATE-QR] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
