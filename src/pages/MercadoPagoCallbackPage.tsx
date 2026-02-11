import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/supabase-client';
import { toast } from 'sonner';

export function MercadoPagoCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Conectando com Mercado Pago...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Recuperar tenant_id da sessionStorage
        const tenantId = sessionStorage.getItem('mp_oauth_tenant_id');

        // 1. Validar resposta do Mercado Pago
        if (errorParam) {
          throw new Error(errorDescription || 'Erro na autorização do Mercado Pago');
        }

        if (!code || !state || !tenantId) {
          throw new Error('Parâmetros inválidos no callback');
        }

        // 2. Chamar Edge Function para processar OAuth
        setMessage('Processando autenticação...');
        const response = await fetch('/functions/v1/mercadopago-oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, tenant_id: tenantId }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Erro ao conectar com Mercado Pago');
        }

        setMessage(
          `✅ Conectado com sucesso!\n\nConta: ${data.user.email}\nUser ID: ${data.user.id}`
        );
        setStatus('success');

        // Limpar sessionStorage
        sessionStorage.removeItem('mp_oauth_tenant_id');

        // Redirecionar ao admin após 2 segundos
        setTimeout(() => {
          navigate('/admin/payment-settings');
          toast.success('Mercado Pago conectado com sucesso!');
        }, 2000);
      } catch (error) {
        console.error('Callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(errorMessage);
        setMessage(errorMessage);
        setStatus('error');
        sessionStorage.removeItem('mp_oauth_tenant_id');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            Mercado Pago
          </CardTitle>
          <CardDescription>
            {status === 'loading' ? 'Conectando...' : status === 'success' ? 'Sucesso!' : 'Erro'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-center whitespace-pre-line text-muted-foreground">
            {message}
          </div>

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {status === 'error' && (
            <Button
              onClick={() => navigate('/admin/payment-settings')}
              className="w-full"
              variant="outline"
            >
              Voltar ao Admin
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
