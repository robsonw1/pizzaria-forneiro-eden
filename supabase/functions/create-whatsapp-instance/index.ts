import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInstanceRequest {
  establishment_name: string;
  instance_name: string;
  tenant_id: string;
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

    let body: CreateInstanceRequest;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error('❌ Erro ao fazer parse do JSON:', parseErr);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { establishment_name, instance_name, tenant_id } = body;

    console.log(`🚀 [CREATE-INSTANCE] Recebido:`, { establishment_name, instance_name, tenant_id });

    // Validar entrada
    if (!establishment_name) {
      console.error('❌ establishment_name vazio ou undefined');
      return new Response(
        JSON.stringify({ success: false, message: 'establishment_name é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!instance_name) {
      console.error('❌ instance_name vazio ou undefined');
      return new Response(
        JSON.stringify({ success: false, message: 'instance_name é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!tenant_id) {
      console.error('❌ tenant_id vazio ou undefined');
      return new Response(
        JSON.stringify({ success: false, message: 'tenant_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar se tenant existe
    console.log('📋 Verificando se tenant existe:', tenant_id);
    const { data: tenantExists, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .single();
    
    if (tenantError || !tenantExists) {
      console.error('❌ Tenant não encontrado:', tenantError);
      return new Response(
        JSON.stringify({ success: false, message: 'Tenant não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar se instance já existe no banco
    console.log('📋 Verificando se instance já existe:', instance_name);
    const { data: existing, error: checkError } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('evolution_instance_name', instance_name);
    
    if (checkError) {
      console.error('❌ Erro ao verificar instância existente:', checkError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao verificar instância' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existing && existing.length > 0) {
      console.error('❌ Instance já existe:', instance_name);
      return new Response(
        JSON.stringify({ success: false, message: 'Nome de instância já em uso' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar instância na Evolution API
    if (!evolutionUrl || !evolutionKey) {
      console.error('❌ Credenciais Evolution não configuradas');
      return new Response(
        JSON.stringify({ success: false, message: 'Evolution API não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createInstanceUrl = `${evolutionUrl.replace(/\/$/, '')}/instance/create`;
    
    console.log(`📱 [EVOLUTION] Criando instância em: ${createInstanceUrl}`);

    const evolutionResponse = await fetch(createInstanceUrl, {
      method: 'POST',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instance_name,
        // NÃO enviar 'number' vazio - será preenchido quando conectar via WhatsApp
        // number: '', // Remover para evitar erro de validação
        clientSecret: '',
        serverUrl: supabaseUrl,
        token: supabaseKey,
      }),
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.error('❌ Evolution API retornou erro:', { status: evolutionResponse.status, data: evolutionData });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Evolution API error (${evolutionResponse.status}): ${evolutionData.message || 'Unknown error'}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar instância no banco de dados
    console.log('💾 Salvando instância no banco de dados...');
    const { data: newInstance, error: insertError } = await supabase
      .from('whatsapp_instances')
      .insert({
        tenant_id: tenant_id,
        establishment_name,
        evolution_instance_name: instance_name,
        is_connected: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir no banco:', insertError);
      return new Response(
        JSON.stringify({ success: false, message: `Database error: ${insertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [CREATE-INSTANCE] Instância criada com sucesso: ${instance_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instância criada com sucesso',
        instance: newInstance,
        evolution: evolutionData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ [CREATE-INSTANCE] Erro não tratado:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
