import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface LoyaltySettings {
  id: string;
  pointsPerReal: number;
  discountPer100Points: number;
  minPointsToRedeem: number;
  bronzeMultiplier: number;
  silverMultiplier: number;
  goldMultiplier: number;
  silverThreshold: number;
  goldThreshold: number;
  signupBonusPoints: number;
  referralBonusPoints: number;
  pointsExpirationDays: number;
  updatedAt: string;
}

interface LoyaltySettingsStore {
  settings: LoyaltySettings | null;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<LoyaltySettings>) => Promise<boolean>;
}

export const useLoyaltySettingsStore = create<LoyaltySettingsStore>((set, get) => ({
  settings: null,

  loadSettings: async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('loyalty_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao carregar configurações de fidelização:', error);
        return;
      }

      if (data) {
        const settings: LoyaltySettings = {
          id: data.id,
          pointsPerReal: data.points_per_real || 1.0,
          discountPer100Points: data.discount_per_100_points || 5.0,
          minPointsToRedeem: data.min_points_to_redeem || 50,
          bronzeMultiplier: data.bronze_multiplier || 1.0,
          silverMultiplier: data.silver_multiplier || 1.1,
          goldMultiplier: data.gold_multiplier || 1.2,
          silverThreshold: data.silver_threshold || 500,
          goldThreshold: data.gold_threshold || 1500,
          signupBonusPoints: data.signup_bonus_points || 50,
          referralBonusPoints: data.referral_bonus_points || 100,
          pointsExpirationDays: data.points_expiration_days || 365,
          updatedAt: data.updated_at,
        };

        set({ settings });
        console.log('✅ Configurações de fidelização carregadas:', settings);
      }
    } catch (error) {
      console.error('Erro em loadSettings:', error);
    }
  },

  updateSettings: async (updates: Partial<LoyaltySettings>) => {
    try {
      const current = get().settings;
      if (!current) {
        console.error('Nenhuma configuração carregada');
        return false;
      }

      // Mapear campos camelCase para snake_case
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.pointsPerReal !== undefined) dbUpdates.points_per_real = updates.pointsPerReal;
      if (updates.discountPer100Points !== undefined) dbUpdates.discount_per_100_points = updates.discountPer100Points;
      if (updates.minPointsToRedeem !== undefined) dbUpdates.min_points_to_redeem = updates.minPointsToRedeem;
      if (updates.bronzeMultiplier !== undefined) dbUpdates.bronze_multiplier = updates.bronzeMultiplier;
      if (updates.silverMultiplier !== undefined) dbUpdates.silver_multiplier = updates.silverMultiplier;
      if (updates.goldMultiplier !== undefined) dbUpdates.gold_multiplier = updates.goldMultiplier;
      if (updates.silverThreshold !== undefined) dbUpdates.silver_threshold = updates.silverThreshold;
      if (updates.goldThreshold !== undefined) dbUpdates.gold_threshold = updates.goldThreshold;
      if (updates.signupBonusPoints !== undefined) dbUpdates.signup_bonus_points = updates.signupBonusPoints;
      if (updates.referralBonusPoints !== undefined) dbUpdates.referral_bonus_points = updates.referralBonusPoints;
      if (updates.pointsExpirationDays !== undefined) dbUpdates.points_expiration_days = updates.pointsExpirationDays;

      const { error } = await (supabase as any)
        .from('loyalty_settings')
        .update(dbUpdates)
        .eq('id', current.id);

      if (error) {
        console.error('Erro ao atualizar configurações:', error);
        return false;
      }

      // Atualizar estado local
      const updatedSettings: LoyaltySettings = {
        ...current,
        ...updates,
        updatedAt: dbUpdates.updated_at,
      };

      set({ settings: updatedSettings });
      console.log('✅ Configurações atualizadas com sucesso:', updatedSettings);
      return true;
    } catch (error) {
      console.error('Erro em updateSettings:', error);
      return false;
    }
  },
}));
