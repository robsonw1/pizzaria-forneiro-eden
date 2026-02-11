import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseMercadoPagoOAuthReturn {
  isConnecting: boolean;
  connectMercadoPago: () => Promise<void>;
  disconnectMercadoPago: () => Promise<void>;
}

/**
 * Hook para gerenciar OAuth com Mercado Pago
 * Gera state, redireciona para autorização, e processa callback
 */
export const useMercadoPagoOAuth = (tenantId: string): UseMercadoPagoOAuthReturn => {
  const MP_CLIENT_ID = import.meta.env.VITE_MERCADOPAGO_CLIENT_ID;
  const REDIRECT_URI = `${window.location.origin}/admin/mercadopago-callback`;

  const generateRandomState = useCallback((): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }, []);

  const connectMercadoPago = useCallback(async () => {
    try {
      if (!MP_CLIENT_ID) {
        toast.error('Mercado Pago Client ID não configurado');
        return;
      }

      // 1. Gerar state aleatório
      const state = generateRandomState();

      // 2. Armazenar state no tenant (para validação após callback)
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ mercadopago_oauth_state: state })
        .eq('id', tenantId);

      if (updateError) {
        toast.error('Erro ao preparar autenticação');
        return;
      }

      // 3. Redirecionar para Mercado Pago
      const authUrl = new URL('https://auth.mercadopago.com.br/authorization');
      authUrl.searchParams.set('client_id', MP_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('platform_id', 'mp');
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', 'wallet:payment wallet:paymentv2 wallet:account');

      // Guardar tenant_id na sessionStorage para recuperar após callback
      sessionStorage.setItem('mp_oauth_tenant_id', tenantId);

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('OAuth connection error:', error);
      toast.error('Erro ao conectar com Mercado Pago');
    }
  }, [MP_CLIENT_ID, tenantId, generateRandomState]);

  const disconnectMercadoPago = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          mercadopago_access_token: null,
          mercadopago_refresh_token: null,
          mercadopago_user_id: null,
          mercadopago_merchant_account_id: null,
          mercadopago_connected_at: null,
          mercadopago_token_expires_at: null,
          mercadopago_oauth_state: null,
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast.success('Mercado Pago desconectado com sucesso');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Erro ao desconectar Mercado Pago');
    }
  }, [tenantId]);

  return {
    isConnecting: false,
    connectMercadoPago,
    disconnectMercadoPago,
  };
};
