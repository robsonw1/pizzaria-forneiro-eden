import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, LogOut, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMercadoPagoOAuth } from '@/hooks/use-mercadopago-oauth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MercadoPagoConnection {
  mercadopago_access_token: string | null;
  mercadopago_user_id: string | null;
  mercadopago_connected_at: string | null;
  mercadopago_token_expires_at: string | null;
  mercadopago_merchant_account_id: string | null;
}

export function PaymentSettingsPanel() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [connection, setConnection] = useState<MercadoPagoConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { connectMercadoPago, disconnectMercadoPago } = useMercadoPagoOAuth(
    tenantId || ''
  );

  // Obter tenant_id do usuário logado
  useEffect(() => {
    const loadTenantId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('No user logged in');
          setIsLoading(false);
          return;
        }

        // Buscar tenant relacionado ao usuário
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .limit(1)
          .single();

        if (error || !data?.id) {
          console.error('Error loading tenant:', error);
          setIsLoading(false);
          return;
        }

        setTenantId(data.id);
      } catch (error) {
        console.error('Unexpected error loading tenant:', error);
        setIsLoading(false);
      }
    };

    loadTenantId();
  }, []);

  // Carregar conexão atual
  useEffect(() => {
    const loadConnection = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (error) {
          console.error('Error loading connection:', error);
          setConnection(null);
        } else if (tenant) {
          // Safe access com fallback
          const tenantData = tenant as Record<string, any>;
          const connData: MercadoPagoConnection = {
            mercadopago_access_token: tenantData.mercadopago_access_token || null,
            mercadopago_user_id: tenantData.mercadopago_user_id || null,
            mercadopago_connected_at: tenantData.mercadopago_connected_at || null,
            mercadopago_token_expires_at: tenantData.mercadopago_token_expires_at || null,
            mercadopago_merchant_account_id: tenantData.mercadopago_merchant_account_id || null,
          };
          setConnection(connData);
        }
      } catch (error) {
        console.error('Unexpected error loading connection:', error);
        setConnection(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnection();
  }, [tenantId]);

  // Verificar se token está expirado
  const isTokenExpired = connection?.mercadopago_token_expires_at
    ? new Date(connection.mercadopago_token_expires_at) < new Date()
    : false;

  const isConnected = !!connection?.mercadopago_access_token && !isTokenExpired;

  const handleConnect = async () => {
    setIsRefreshing(true);
    try {
      await connectMercadoPago();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsRefreshing(true);
    try {
      await disconnectMercadoPago();
      setConnection(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Mercado Pago
              </CardTitle>
              <CardDescription>
                Conecte sua conta do Mercado Pago para receber pagamentos diretamente
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? '🟢 Conectado' : '⚪ Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tenantId ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao carregar sua conta. Por favor, faça login novamente.
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {isConnected ? (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Sua conta Mercado Pago está conectada e ativa. Todos os pagamentos
                      serão recebidos diretamente nesta conta.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">User ID</p>
                      <p className="font-mono text-sm font-semibold">
                        {connection?.mercadopago_user_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Merchant Account</p>
                      <p className="font-mono text-sm font-semibold">
                        {connection?.mercadopago_merchant_account_id || 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Conectado em</p>
                      <p className="text-sm">
                        {connection?.mercadopago_connected_at
                          ? formatDistanceToNow(new Date(connection.mercadopago_connected_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleDisconnect}
                    disabled={isRefreshing}
                    variant="destructive"
                    className="w-full"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-2" />
                        Desconectar Mercado Pago
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {isTokenExpired && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Seu token expirou. Reconecte sua conta Mercado Pago.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3 rounded-lg border-2 border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Clique para autorizar sua conta Mercado Pago
                    </p>
                    <Button
                      onClick={handleConnect}
                      disabled={isRefreshing}
                      size="lg"
                      className="w-full"
                    >
                      {isRefreshing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Conectar Mercado Pago
                        </>
                      )}
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Benefícios:</strong>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                        <li>Pagamentos recebem diretamente na sua conta</li>
                        <li>Sem intermediários ou taxa adicional</li>
                        <li>Integração segura via OAuth</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
