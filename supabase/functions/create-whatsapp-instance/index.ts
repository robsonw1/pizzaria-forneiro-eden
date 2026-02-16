import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInstanceRequest {
  establishment_name: string;
  instance_name: string;
  tenant_id?: string;
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

    const body = await req.json() as CreateInstanceRequest;
    const { establishment_name, instance_name } = body;

    console.log(`🚀 [CREATE-INSTANCE] ${instance_name} - ${establishment_name}`);

    // Validar entrada
    if (!establishment_name || !instance_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar se instance já existe no banco
    const { data: existing } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('evolution_instance_name', instance_name)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Instance name already in use' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter tenant_id do contexto de autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'No authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter tenant_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, message: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = profile.tenant_id;

    // Criar instância na Evolution API
    if (!evolutionUrl || !evolutionKey) {
      console.error('Evolution credentials not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Evolution API not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createInstanceUrl = `${evolutionUrl.replace(/\/$/, '')}/instance/create`;
    
    console.log(`📱 [EVOLUTION] Creating instance at: ${createInstanceUrl}`);

    const evolutionResponse = await fetch(createInstanceUrl, {
      method: 'POST',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instance_name,
        number: '', // Will be set when connecting
        clientSecret: '',
        serverUrl: supabaseUrl,
        token: supabaseKey,
      }),
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.error('Evolution API error:', evolutionData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: evolutionData.message || 'Failed to create instance in Evolution API' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar instância no banco de dados
    const { data: newInstance, error: insertError } = await supabase
      .from('whatsapp_instances')
      .insert({
        tenant_id: tenantId,
        establishment_name,
        evolution_instance_name: instance_name,
        is_connected: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to save instance to database' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [CREATE-INSTANCE] Successfully created: ${instance_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instance created successfully',
        instance: newInstance,
        evolution: evolutionData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ [CREATE-INSTANCE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
