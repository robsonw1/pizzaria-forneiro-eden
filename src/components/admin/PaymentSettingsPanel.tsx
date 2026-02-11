import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Copy, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantData {
  id: string;
  mercadopago_access_token: string | null;
  mercadopago_user_id: string | null;
}

export function PaymentSettingsPanel() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [savedToken, setSavedToken] = useState<string>(''); // Token salvo no DB
  const [displayToken, setDisplayToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Carregar tenant_id e token existente
  useEffect(() => {
    const loadTenantInfo = async () => {
      try {
        setIsLoading(true);
        
        // Buscar primeiro tenant
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, mercadopago_access_token')
          .limit(1);

        if (tenantsError || !tenants || tenants.length === 0) {
          console.error('Error loading tenants:', tenantsError);
          toast.error('Estabelecimento não encontrado');
          return;
        }

        const tenant = tenants[0] as TenantData;
        setTenantId(tenant.id);
        
        if (tenant.mercadopago_access_token) {
          const fullToken = tenant.mercadopago_access_token;
          setSavedToken(fullToken);
          setToken(fullToken);
          // Mostrar apenas últimos 20 caracteres
          const lastChars = fullToken.slice(-20);
          setDisplayToken(`...${lastChars}`);
        } else {
          setSavedToken('');
          setToken('');
          setDisplayToken('');
        }
      } catch (error) {
        console.error('Error loading tenant:', error);
        toast.error('Erro ao carregar estabelecimento');
      } finally {
        setIsLoading(false);
      }
    };

    loadTenantInfo();
  }, []);

  const isConnected = !!savedToken;

  const handleSaveToken = async () => {
    if (!token.trim()) {
      toast.error('Token não pode estar vazio');
      return;
    }

    if (!token.startsWith('APP_USR-')) {
      toast.error('Token inválido. Deve começar com APP_USR-');
      return;
    }

    if (!tenantId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ mercadopago_access_token: token })
        .eq('id', tenantId);

      if (error) throw error;

      setSavedToken(token);
      setDisplayToken(`...${token.slice(-20)}`);
      setShowTokenInput(false);
      toast.success('Token Mercado Pago salvo com sucesso!');
      console.log('✅ Token salvo:', tenantId);
    } catch (error) {
      console.error('Error saving token:', error);
      toast.error('Erro ao salvar token. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteToken = async () => {
    if (!tenantId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    if (!window.confirm('Tem certeza que deseja remover o token Mercado Pago?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ mercadopago_access_token: null })
        .eq('id', tenantId);

      if (error) throw error;

      setSavedToken('');
      setToken('');
      setDisplayToken('');
      setShowTokenInput(false);
      toast.success('Token Mercado Pago removido');
      console.log('✅ Token removido:', tenantId);
    } catch (error) {
      console.error('Error deleting token:', error);
      toast.error('Erro ao remover token. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success('Token copiado!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                Gerencie o Access Token para receber pagamentos
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-600' : ''}>
              {isConnected ? '🟢 Conectado' : '⚪ Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Sua conta Mercado Pago está ativa. Todos os pagamentos serão processados
                  com este token.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Access Token</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold flex-1">{displayToken}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyToken}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  variant="outline"
                  className="flex-1"
                >
                  Atualizar Token
                </Button>
                <Button
                  onClick={handleDeleteToken}
                  disabled={isDeleting}
                  variant="destructive"
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum token configurado. Adicione um Access Token do Mercado Pago para começar a receber pagamentos.
                </AlertDescription>
              </Alert>

              {!showTokenInput && (
                <Button
                  onClick={() => setShowTokenInput(true)}
                  className="w-full"
                >
                  Adicionar Token
                </Button>
              )}
            </>
          )}

          {showTokenInput && (
            <div className="space-y-3 rounded-lg border-2 border-dashed p-4">
              <div>
                <Label htmlFor="mp-token">Access Token Mercado Pago</Label>
                <Input
                  id="mp-token"
                  type="password"
                  placeholder="APP_USR-..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="mt-2 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Obtém em: Mercado Pago → Sua conta → Configurações → Credenciais
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveToken}
                  disabled={isSaving || !token.trim()}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Salvar Token
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowTokenInput(false);
                    setToken(savedToken); // Reset ao token salvo
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>ℹ️ Como funciona:</strong>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Cada estabelecimento tem seu próprio token</li>
                <li>Pagamentos são processados automaticamente com este token</li>
                <li>O token é armazenado com segurança no banco de dados</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
