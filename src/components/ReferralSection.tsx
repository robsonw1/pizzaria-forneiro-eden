import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { Share2, Copy, Check, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralSectionProps {
  customerId?: string;
}

export function ReferralSection({ customerId }: ReferralSectionProps) {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const getReferralCode = useLoyaltyStore((s) => s.getReferralCode);

  useEffect(() => {
    loadReferralCode();
  }, []);

  const loadReferralCode = async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const code = await getReferralCode(customerId);
      setReferralCode(code);
    } catch (error) {
      console.error('Erro ao carregar código de referral:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = `Indique meu restaurante! Use o código ${referralCode} para ganhar 100 pontos + 50 pontos bônus! ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copiado!');
  };

  const shareOnWhatsapp = () => {
    const text = `Indique meu restaurante! Use o código ${referralCode} para ganhar 100 pontos + 50 pontos bônus! ${window.location.origin}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!customerId || !referralCode) {
    return null;
  }

  return (
    <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
          Indique e Ganhe Pontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white dark:bg-secondary/50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Seu código de referência:</p>
          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg font-bold text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Você ganha</p>
              <p className="text-xs text-muted-foreground">100 pontos</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Seu amigo ganha</p>
              <p className="text-xs text-muted-foreground">50 pontos</p>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="flex-1 gap-2"
            disabled={isLoading}
          >
            <Copy className="w-4 h-4" />
            Copiar Link
          </Button>
          <Button
            onClick={shareOnWhatsapp}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            <Share2 className="w-4 h-4" />
            WhatsApp
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Compartilhe seu código e ganhe pontos quando seus amigos fizerem a primeira compra!
        </p>
      </CardContent>
    </Card>
  );
}
