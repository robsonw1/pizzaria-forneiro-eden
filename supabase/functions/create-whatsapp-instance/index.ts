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
      console.error('❌ Parse error:', parseErr);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { establishment_name, instance_name, tenant_id } = body;
    console.log(`🚀 [CREATE] Received:`, { establishment_name, instance_name, tenant_id });

    if (!establishment_name || !instance_name || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tenant
    const { data: tenantExists } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id);
    
    if (!tenantExists || tenantExists.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tenant not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if tenant already has instance
    const { data: existingInstances } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('tenant_id', tenant_id);
    
    if (existingInstances && existingInstances.length > 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tenant already has an instance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!evolutionUrl || !evolutionKey) {
      console.error('❌ Missing Evolution credentials');
      return new Response(
        JSON.stringify({ success: false, message: 'Evolution API not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize instance name - remove hyphens and special chars
    const sanitizedName = instance_name.toLowerCase().replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
    console.log(`📝 Sanitized name: ${sanitizedName} (original: ${instance_name})`);

    const createUrl = `${evolutionUrl.replace(/\/$/, '')}/instance/create`;
    console.log(`📝 URL: ${createUrl}`);

    const payload = { instanceName: sanitizedName };
    console.log(`📨 Payload:`, JSON.stringify(payload));

    let response;
    let responseData;
    
    try {
      response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'apikey': evolutionKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      responseData = await response.json();
    } catch (err) {
      console.error(`❌ Request failed:`, err);
      return new Response(
        JSON.stringify({ success: false, message: `Request failed: ${String(err)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Response (${response.status}):`, JSON.stringify(responseData));

    if (!response.ok) {
      console.error('❌ Evolution error:', { status: response.status, data: responseData });
      const errorMsg = typeof responseData.message === 'string' 
        ? responseData.message 
        : Array.isArray(responseData.message)
        ? responseData.message.join(', ')
        : responseData.error || 'Unknown error';
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Evolution API: ${errorMsg}`,
          details: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💾 Saving to database...');
    const { data: newInstance, error: insertErr } = await supabase
      .from('whatsapp_instances')
      .insert({
        tenant_id,
        establishment_name,
        evolution_instance_name: instance_name,
        is_connected: false,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('❌ DB error:', insertErr);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to save instance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ SUCCESS: ${instance_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instance created successfully',
        instance: newInstance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
