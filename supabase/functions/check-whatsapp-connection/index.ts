import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckConnectionRequest {
  instance_name: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    const body = await req.json() as CheckConnectionRequest;
    const { instance_name } = body;

    console.log(`🔍 [CHECK-CONNECTION] ${instance_name}`);

    if (!instance_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing instance_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!evolutionUrl || !evolutionKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Evolution API not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar instância na Evolution API
    const checkUrl = `${evolutionUrl.replace(/\/$/, '')}/instance/fetchInstances/${instance_name}`;
    
    const response = await fetch(checkUrl, {
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
          is_connected: false,
          message: 'Instance not found' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se tem número de WhatsApp (indicador de conexão bem-sucedida)
    let isConnected = false;
    if (Array.isArray(data) && data.length > 0) {
      const instance = data[0];
      isConnected = !!(instance.number && instance.number !== '');
    } else if (data.number) {
      isConnected = !!(data.number && data.number !== '');
    }

    console.log(`✅ [CHECK-CONNECTION] ${instance_name} => ${isConnected ? 'Connected' : 'Waiting'}`);

    return new Response(
      JSON.stringify({
        success: true,
        is_connected: isConnected,
        instance_data: data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ [CHECK-CONNECTION] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message, is_connected: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
