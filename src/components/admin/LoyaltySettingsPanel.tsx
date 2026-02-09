import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLoyaltySettingsStore, LoyaltySettings } from '@/store/useLoyaltySettingsStore';
import { toast } from 'sonner';
import { Gift, TrendingUp, Users, Clock } from 'lucide-react';

export function LoyaltySettingsPanel() {
  const { settings, loadSettings, updateSettings } = useLoyaltySettingsStore();
  const [form, setForm] = useState<Partial<LoyaltySettings> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  if (!form) {
    return <div className="text-center py-8">Carregando configurações...</div>;
  }

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await updateSettings({
        pointsPerReal: parseFloat(form.pointsPerReal?.toString() || '1'),
        discountPer100Points: parseFloat(form.discountPer100Points?.toString() || '5'),
        minPointsToRedeem: parseInt(form.minPointsToRedeem?.toString() || '50'),
        bronzeMultiplier: parseFloat(form.bronzeMultiplier?.toString() || '1'),
        silverMultiplier: parseFloat(form.silverMultiplier?.toString() || '1.1'),
        goldMultiplier: parseFloat(form.goldMultiplier?.toString() || '1.2'),
        silverThreshold: parseInt(form.silverThreshold?.toString() || '500'),
        goldThreshold: parseInt(form.goldThreshold?.toString() || '1500'),
        signupBonusPoints: parseInt(form.signupBonusPoints?.toString() || '50'),
        referralBonusPoints: parseInt(form.referralBonusPoints?.toString() || '100'),
        pointsExpirationDays: parseInt(form.pointsExpirationDays?.toString() || '365'),
      });

      if (success) {
        toast.success('Configurações de fidelização salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Configurações de Fidelização
        </CardTitle>
        <CardDescription>
          Customize as regras do programa de pontos e descontos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pontos e Desconto */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Regra de Pontos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/30 p-4 rounded-lg">
            <div>
              <Label htmlFor="points-per-real">Pontos por Real Gasto</Label>
              <Input
                id="points-per-real"
                type="number"
                step="0.1"
                value={form.pointsPerReal || 1}
                onChange={(e) => setForm({ ...form, pointsPerReal: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: 1 = 1 ponto por R$1 gasto
              </p>
            </div>
            <div>
              <Label htmlFor="discount-per-100">Desconto por 100 Pontos (R$)</Label>
              <Input
                id="discount-per-100"
                type="number"
                step="0.5"
                value={form.discountPer100Points || 5}
                onChange={(e) => setForm({ ...form, discountPer100Points: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: 5 = R$5 de desconto por 100 pontos
              </p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 <strong>Proporção atual:</strong> {form.pointsPerReal} pontos/real × {form.discountPer100Points}R$/100pts = {((form.pointsPerReal || 1) * (form.discountPer100Points || 5) / 100).toFixed(2)}% de desconto acumulado
            </p>
          </div>
        </div>

        <Separator />

        {/* Resgate Mínimo */}
        <div>
          <Label htmlFor="min-redeem">Mínimo de Pontos para Resgatar</Label>
          <Input
            id="min-redeem"
            type="number"
            value={form.minPointsToRedeem || 50}
            onChange={(e) => setForm({ ...form, minPointsToRedeem: parseInt(e.target.value) })}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cliente só pode resgatar após atingir essa quantidade
          </p>
        </div>

        <Separator />

        {/* Níveis e Multiplicadores */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Níveis de Cliente (Multiplicadores de Pontos)
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-amber-700 font-medium">Bronze (Padrão)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.bronzeMultiplier || 1}
                  onChange={(e) => setForm({ ...form, bronzeMultiplier: parseFloat(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">Multiplicador: {form.bronzeMultiplier || 1}x</p>
              </div>
              <div>
                <Label className="text-gray-400 font-medium">Prata</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.silverMultiplier || 1.1}
                  onChange={(e) => setForm({ ...form, silverMultiplier: parseFloat(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">A partir de {form.silverThreshold || 500} pontos</p>
              </div>
              <div>
                <Label className="text-yellow-600 font-medium">Ouro</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.goldMultiplier || 1.2}
                  onChange={(e) => setForm({ ...form, goldMultiplier: parseFloat(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">A partir de {form.goldThreshold || 1500} pontos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/30 p-4 rounded-lg">
              <div>
                <Label htmlFor="silver-threshold">Limiar para Prata</Label>
                <Input
                  id="silver-threshold"
                  type="number"
                  value={form.silverThreshold || 500}
                  onChange={(e) => setForm({ ...form, silverThreshold: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="gold-threshold">Limiar para Ouro</Label>
                <Input
                  id="gold-threshold"
                  type="number"
                  value={form.goldThreshold || 1500}
                  onChange={(e) => setForm({ ...form, goldThreshold: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Expiração de Pontos */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Validade dos Pontos
          </h3>
          <div className="bg-secondary/30 p-4 rounded-lg">
            <Label htmlFor="expiration-days">Dias de Validade dos Pontos</Label>
            <div className="mt-2">
              <input
                id="expiration-days"
                type="range"
                min="30"
                max="1095"
                step="30"
                value={form.pointsExpirationDays || 365}
                onChange={(e) => setForm({ ...form, pointsExpirationDays: parseInt(e.target.value) })}
                className="w-full"
              />
              <p className="text-sm font-semibold mt-3">
                {form.pointsExpirationDays || 365} dias ({((form.pointsExpirationDays || 365) / 365).toFixed(1)} ano(s))
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Alcance: 1 mês a 3 anos. Pontos expirados são removidos automaticamente.
            </p>
          </div>
        </div>

        <Separator />

        {/* Bônus */}
        <div>
          <h3 className="font-semibold mb-4">Bônus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signup-bonus">Bônus de Cadastro</Label>
              <Input
                id="signup-bonus"
                type="number"
                value={form.signupBonusPoints || 50}
                onChange={(e) => setForm({ ...form, signupBonusPoints: parseInt(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Pontos concedidos ao novo cliente</p>
            </div>
            <div>
              <Label htmlFor="referral-bonus">Bônus de Referência</Label>
              <Input
                id="referral-bonus"
                type="number"
                value={form.referralBonusPoints || 100}
                onChange={(e) => setForm({ ...form, referralBonusPoints: parseInt(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Pontos concedidos ao referidor</p>
            </div>
          </div>
        </div>

        <Button className="btn-cta w-full" onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Configurações de Fidelização'}
        </Button>
      </CardContent>
    </Card>
  );
}
