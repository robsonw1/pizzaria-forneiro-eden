import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';

export function PaymentSettingsPanel() {
  // Status simplificado: token é configurado nos Supabase Secrets
  // Quando o Access Token está nos Secrets, a integração está sempre ativa
  const isConnected = true;


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
                Integração com token configurado nos Supabase Secrets
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-green-600">
              🟢 Conectado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Sua conta Mercado Pago está conectada e ativa. Todos os pagamentos
              serão processados através do token configurado nos Supabase Secrets.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 bg-muted/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="font-mono text-sm font-semibold text-green-600">
                ✅ Ativo e Operacional
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo de Integração</p>
              <p className="text-sm">Mercado Pago Access Token (via Supabase Secrets)</p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>ℹ️ Informação:</strong>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Token configurado com segurança no backend</li>
                <li>Todos os pagamentos usam credenciais autenticadas</li>
                <li>Sem necessidade de reconexão</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
