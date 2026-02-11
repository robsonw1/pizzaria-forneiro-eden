import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthCallbackRequest {
  code: string;
  state: string;
  tenant_id: string;
}

interface MercadoPagoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

interface MercadoPagoUserResponse {
  id: number;
  nickname: string;
  email: string;
  merchant_account: {
    id: number;
  };
}

interface DenoRequest extends Request {
  method: string;
  json: () => Promise<unknown>;
}

Deno.serve(async (req: DenoRequest) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, state, tenant_id } = (await req.json()) as OAuthCallbackRequest;

    if (!code || !state || !tenant_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: code, state, tenant_id',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ============================================================
    // 1. VALIDAR STATE (previne CSRF attacks)
    // ============================================================
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('mercadopago_oauth_state')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (tenant.mercadopago_oauth_state !== state) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid state - CSRF attempt detected' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // ============================================================
    // 2. TROCAR CODE POR ACCESS TOKEN
    // ============================================================
    const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID');
    const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET');
    const REDIRECT_URI = Deno.env.get('MERCADOPAGO_REDIRECT_URI') || 
      'https://seu-app.vercel.app/api/mercadopago-oauth-callback';

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Mercado Pago credentials' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Mercado Pago token error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to exchange code for token',
          details: error,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const mpToken = (await tokenResponse.json()) as MercadoPagoTokenResponse;

    // ============================================================
    // 3. BUSCAR DADOS DO USUÁRIO DO MERCADO PAGO
    // ============================================================
    const userResponse = await fetch('https://api.mercadopago.com/v1/users/me', {
      headers: { Authorization: `Bearer ${mpToken.access_token}` },
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      console.error('Mercado Pago user error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch user data',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const mpUser = (await userResponse.json()) as MercadoPagoUserResponse;

    // ============================================================
    // 4. ARMAZENAR CREDENCIAIS NO BANCO
    // ============================================================
    const { data, error } = await supabase.rpc('update_mercadopago_credentials', {
      p_tenant_id: tenant_id,
      p_access_token: mpToken.access_token,
      p_refresh_token: mpToken.refresh_token,
      p_user_id: mpUser.id.toString(),
      p_merchant_account_id: mpUser.merchant_account?.id?.toString() || null,
      p_expires_in: mpToken.expires_in || 21600,
    });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to save credentials',
          details: error.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // ============================================================
    // 5. PREPARAR RESPOSTA
    // ============================================================
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mercado Pago conectado com sucesso!',
        user: {
          id: mpUser.id,
          nickname: mpUser.nickname,
          email: mpUser.email,
        },
        expiresIn: mpToken.expires_in,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
