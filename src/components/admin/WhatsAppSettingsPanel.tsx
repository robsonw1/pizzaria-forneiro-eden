import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Check, X, TestTube, Save, AlertCircle } from 'lucide-react';

interface TenantConfig {
  id: string;
  name: string;
  evolution_instance_name: string | null;
  evolution_connected_at: string | null;
  whatsapp_notifications_enabled: boolean;
}

interface StatusMessage {
  id: string;
  status: string;
  message_template: string;
  enabled: boolean;
}

const DEFAULT_MESSAGES = {
  confirmado: '🍕 Oi {nome}! Seu pedido #{pedido} foi confirmado! ⏱️ Saindo do forno em ~25min',
  preparing: '👨‍🍳 Seu pedido #{pedido} está sendo preparado com capricho!',
  delivering: '🚗 Seu pedido #{pedido} está a caminho! 📍 Chega em ~15min',
  delivered: '✅ Pedido #{pedido} entregue! Valeu pela compra 🙏',
  cancelled: '❌ Pedido #{pedido} foi cancelado. Em caso de dúvidas, nos contate!',
};

export const WhatsAppSettingsPanel = () => {
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Estados locais dos inputs
  const [instanceName, setInstanceName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 1. Pegar primeiro tenant (assumindo single-tenant ou usar sessionStorage)
      const tenantId = sessionStorage.getItem('tenant_id');
      
      if (!tenantId) {
        // Buscar o primeiro tenant
        const { data: tenants } = await (supabase as any)
          .from('tenants')
          .select('*')
          .limit(1)
          .single();

        if (!tenants) {
          toast.error('Nenhum tenant encontrado');
          return;
        }

        const tenantConfig = tenants as TenantConfig;
        setTenantConfig(tenantConfig);
        setInstanceName(tenantConfig.evolution_instance_name || '');
        setNotificationsEnabled(tenantConfig.whatsapp_notifications_enabled ?? true);
      } else {
        const { data: tenant } = await (supabase as any)
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (tenant) {
          const tenantConfig = tenant as TenantConfig;
          setTenantConfig(tenantConfig);
          setInstanceName(tenantConfig.evolution_instance_name || '');
          setNotificationsEnabled(tenantConfig.whatsapp_notifications_enabled ?? true);
        }
      }

      // 2. Carregar mensagens de status
      if (tenantConfig?.id) {
        loadStatusMessages(tenantConfig.id);
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadStatusMessages = async (tenantId: string) => {
    try {
      const { data } = await (supabase as any)
        .from('whatsapp_status_messages')
        .select('*')
        .eq('tenant_id', tenantId);

      if (data && data.length > 0) {
        setStatusMessages(data as StatusMessage[]);
      } else {
        // Criar mensagens padrão se não existirem
        const defaultMsgs = Object.entries(DEFAULT_MESSAGES).map(([status, message]) => ({
          id: '',
          status,
          message_template: message,
          enabled: true,
        }));
        setStatusMessages(defaultMsgs);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const saveConfig = async () => {
    if (!tenantConfig) return;

    if (!instanceName) {
      toast.error('Preencha o nome da instância');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('tenants')
        .update({
          evolution_instance_name: instanceName,
          whatsapp_notifications_enabled: notificationsEnabled,
          evolution_connected_at: new Date().toISOString(),
        })
        .eq('id', tenantConfig.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
      setTenantConfig({
        ...tenantConfig,
        evolution_instance_name: instanceName,
        whatsapp_notifications_enabled: notificationsEnabled,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!instanceName) {
      toast.error('Preencha o nome da instância primeiro');
      return;
    }

    setTesting(true);
    try {
      // Testar chamando a Edge Function
      const { data, error } = await (supabase as any).functions.invoke('send-whatsapp-notification', {
        body: {
          orderId: 'TEST-' + Date.now(),
          status: 'test',
          phone: '5585999999999',
          customerName: 'Teste',
          tenantId: tenantConfig?.id || '',
        },
      });

      if (error) {
        toast.error(`❌ Erro na conexão: ${error.message}`);
      } else if (data?.success) {
        toast.success('✅ Instância testada com sucesso!');
      } else {
        toast.warning(`⚠️ ${data?.message || 'Verifique a configuração'}`);
      }
    } catch (error) {
      console.error('Erro ao testar:', error);
      toast.error('Erro ao testar instância. Verificar console para detalhes.');
    } finally {
      setTesting(false);
    }
  };

  const saveStatusMessages = async () => {
    if (!tenantConfig) return;

    setSaving(true);
    try {
      // 1. Deletar mensagens antigas
      await (supabase as any)
        .from('whatsapp_status_messages')
        .delete()
        .eq('tenant_id', tenantConfig.id);

      // 2. Inserir novas
      const messagesToInsert = statusMessages.map(msg => ({
        tenant_id: tenantConfig.id,
        status: msg.status,
        message_template: msg.message_template,
        enabled: msg.enabled,
      }));

      const { error } = await (supabase as any)
        .from('whatsapp_status_messages')
        .insert(messagesToInsert);

      if (error) throw error;

      toast.success('Mensagens salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
      toast.error('Erro ao salvar mensagens');
    } finally {
      setSaving(false);
    }
  };

  const updateMessageTemplate = (status: string, newTemplate: string) => {
    setStatusMessages(statusMessages.map(msg =>
      msg.status === status
        ? { ...msg, message_template: newTemplate }
        : msg
    ));
  };

  const toggleMessageEnabled = (status: string) => {
    setStatusMessages(statusMessages.map(msg =>
      msg.status === status
        ? { ...msg, enabled: !msg.enabled }
        : msg
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin mr-2" />
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection">
            <span className="flex items-center gap-2">
              <span>🔌 Conexão</span>
              {tenantConfig?.evolution_connected_at && (
                <Badge variant="outline" className="ml-2">Conectado</Badge>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="messages">
            <span className="flex items-center gap-2">
              <span>💬 Mensagens</span>
              {notificationsEnabled && (
                <Badge variant="outline" className="ml-2">Ativado</Badge>
              )}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: CONEXÃO */}
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Conexão WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Como funciona:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Digite um <strong>nome único</strong> para este estabelecimento</li>
                    <li>Exemplo: "pizzaria-santos" ou "forneiro-centro"</li>
                    <li>Clique em "Testar Conexão" (usa sua API secretamente)</li>
                    <li>Salve as configurações</li>
                  </ol>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="instance-name">Nome da Instância WhatsApp *</Label>
                  <Input
                    id="instance-name"
                    placeholder="pizzaria-santos"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nome único sem espaços (ex: pizzaria-centro, forneiro-eden)</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Habilitar Notificações</Label>
                    <p className="text-xs text-gray-500 mt-1">Enviar avisos quando status muda</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
              </div>

              {/* Status */}
              {tenantConfig?.evolution_connected_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-900">Conectado em:</p>
                    <p className="text-green-800">
                      {new Date(tenantConfig.evolution_connected_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={testing || saving}
                  className="gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button
                  onClick={saveConfig}
                  disabled={saving || testing}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MENSAGENS */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens de Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  <strong>Variáveis disponíveis:</strong><br />
                  {'{nome}'} = Nome do cliente<br />
                  {'{pedido}'} = ID do pedido<br />
                  {'{status}'} = Status atual
                </p>
              </div>

              {/* Mensagens por Status */}
              <div className="space-y-4">
                {statusMessages.map((msg) => (
                  <div key={msg.status} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold capitalize">{msg.status}</h4>
                      <Switch
                        checked={msg.enabled}
                        onCheckedChange={() => toggleMessageEnabled(msg.status)}
                      />
                    </div>

                    <Textarea
                      value={msg.message_template}
                      onChange={(e) => updateMessageTemplate(msg.status, e.target.value)}
                      disabled={!msg.enabled}
                      className="text-sm"
                      rows={3}
                    />

                    {!msg.enabled && (
                      <p className="text-xs text-gray-500">
                        ⚠️ Esta mensagem está desabilitada
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <Button
                onClick={saveStatusMessages}
                disabled={saving}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Mensagens'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
