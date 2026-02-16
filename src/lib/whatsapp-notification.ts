/**
 * Helper para enviar notificações de pedido via WhatsApp
 * Integração com Evolution API
 */

import { supabase } from '@/integrations/supabase/client';

export interface SendNotificationParams {
  orderId: string;
  status: string;
  phone: string;
  customerName: string;
  tenantId: string;
}

/**
 * Envia notificação de pedido via WhatsApp
 * Executa de forma assíncrona e não bloqueia o fluxo principal
 */
export async function sendOrderNotification(params: SendNotificationParams): Promise<void> {
  try {
    // Validar parâmetros
    if (!params.orderId || !params.status || !params.phone || !params.tenantId) {
      console.warn('⚠️ [Notificação] Parâmetros incompletos:', params);
      return;
    }

    // Invocar Edge Function de forma assíncrona
    supabase.functions
      .invoke('send-whatsapp-notification', {
        body: params,
      })
      .then((response) => {
        if (response.data?.success) {
          console.log(`✅ [Notificação] Mensagem enviada para ${params.phone}`);
        } else {
          console.warn(`⚠️ [Notificação] Falha ao enviar:`, response.data?.error);
        }
      })
      .catch((error) => {
        console.warn(`⚠️ [Notificação] Erro ao chamar função:`, error);
      });
  } catch (error) {
    console.error('❌ [Notificação] Erro inesperado:', error);
  }
}

/**
 * Envia notificação com retry automático
 * Útil para operações críticas
 */
export async function sendOrderNotificationWithRetry(
  params: SendNotificationParams,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await supabase.functions.invoke('send-whatsapp-notification', {
        body: params,
      });

      if (response.data?.success) {
        console.log(`✅ [Notificação] Enviada com sucesso (tentativa ${attempt})`);
        return true;
      }

      if (attempt < maxRetries) {
        // Aguardar antes de retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.warn(`⚠️ [Notificação] Tentativa ${attempt} falhou:`, error);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error('❌ [Notificação] Falha após', maxRetries, 'tentativas');
  return false;
}

/**
 * Testa conexão com Evolution API
 */
export async function testEvolutionConnection(
  url: string,
  apiKey: string,
  instanceName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const testUrl = `${url.replace(/\/$/, '')}/instance/connectionState/${instanceName}`;

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Conectado! Status: ${JSON.stringify(data)}`,
      };
    } else {
      return {
        success: false,
        message: `Erro ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro de conexão: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    };
  }
}
