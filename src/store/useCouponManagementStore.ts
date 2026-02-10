import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface AdminCoupon {
  id: string;
  couponCode: string;
  discountPercentage: number;
  description?: string;
  isActive: boolean;
  isUsed: boolean;
  validDays: number;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  usageCount: number;
  maxUsage?: number;
}

interface CouponManagementState {
  coupons: AdminCoupon[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createCoupon: (
    percentageDiscount: number,
    validDays: number,
    maxUsage?: number,
    description?: string
  ) => Promise<AdminCoupon | null>;
  
  getCoupons: () => Promise<void>;
  
  deleteCoupon: (couponId: string) => Promise<boolean>;
  
  validateAndUseCoupon: (
    couponCode: string,
    customerId?: string
  ) => Promise<{ valid: boolean; discount: number; message: string }>;
  
  markCouponAsUsed: (couponCode: string, customerId?: string) => Promise<boolean>;
  
  deactivateCoupon: (couponId: string) => Promise<boolean>;
}

export const useCouponManagementStore = create<CouponManagementState>((set, get) => ({
  coupons: [],
  loading: false,
  error: null,

  createCoupon: async (percentageDiscount, validDays, maxUsage, description) => {
    try {
      set({ loading: true, error: null });

      const couponCode = `PROMO${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validDays);

      const { data, error } = await (supabase as any)
        .from('loyalty_coupons')
        .insert([
          {
            coupon_code: couponCode,
            discount_percentage: percentageDiscount,
            is_active: true,
            is_used: false,
            expires_at: expiresAt.toISOString(),
            customer_id: null, // Cupom geral, não é para cliente específico
            discount_amount: null,
            points_threshold: null,
          },
        ])
        .select()
        .single();

      if (error) {
        const errorMsg = `Erro ao criar cupom: ${error.message}`;
        set({ error: errorMsg });
        console.error(errorMsg);
        return null;
      }

      const newCoupon: AdminCoupon = {
        id: data.id,
        couponCode: data.coupon_code,
        discountPercentage: data.discount_percentage,
        description: description || '',
        isActive: data.is_active,
        isUsed: data.is_used,
        validDays: validDays,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        usageCount: 0,
        maxUsage: maxUsage,
      };

      // Buscar cupons atualizados
      await get().getCoupons();

      console.log('✅ Cupom criado:', couponCode);
      return newCoupon;
    } catch (error) {
      const errorMsg = `Erro em createCoupon: ${error}`;
      set({ error: errorMsg });
      console.error(errorMsg);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  getCoupons: async () => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await (supabase as any)
        .from('loyalty_coupons')
        .select('*')
        .is('customer_id', null) // Apenas cupons gerais (não automáticos por cliente)
        .order('created_at', { ascending: false });

      if (error) {
        const errorMsg = `Erro ao buscar cupons: ${error.message}`;
        set({ error: errorMsg });
        console.error(errorMsg);
        return;
      }

      const mappedCoupons: AdminCoupon[] = (data || []).map((coupon: any) => ({
        id: coupon.id,
        couponCode: coupon.coupon_code,
        discountPercentage: coupon.discount_percentage,
        description: coupon.description || '',
        isActive: coupon.is_active,
        isUsed: coupon.is_used,
        validDays: 0, // Calculado na expiração
        expiresAt: coupon.expires_at,
        createdAt: coupon.created_at,
        usedAt: coupon.used_at,
        usageCount: 0, // Poderia contar em future
      }));

      set({ coupons: mappedCoupons });
    } catch (error) {
      const errorMsg = `Erro em getCoupons: ${error}`;
      set({ error: errorMsg });
      console.error(errorMsg);
    } finally {
      set({ loading: false });
    }
  },

  deleteCoupon: async (couponId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await (supabase as any)
        .from('loyalty_coupons')
        .delete()
        .eq('id', couponId);

      if (error) {
        const errorMsg = `Erro ao deletar cupom: ${error.message}`;
        set({ error: errorMsg });
        console.error(errorMsg);
        return false;
      }

      // Atualizar lista
      await get().getCoupons();
      console.log('✅ Cupom deletado');
      return true;
    } catch (error) {
      const errorMsg = `Erro em deleteCoupon: ${error}`;
      set({ error: errorMsg });
      console.error(errorMsg);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  validateAndUseCoupon: async (couponCode: string, customerId?: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('loyalty_coupons')
        .select('*')
        .eq('coupon_code', couponCode.toUpperCase())
        .single();

      if (error || !data) {
        return {
          valid: false,
          discount: 0,
          message: '❌ Cupom inválido',
        };
      }

      // Verificar se está ativo
      if (!data.is_active) {
        return {
          valid: false,
          discount: 0,
          message: '❌ Cupom desativado',
        };
      }

      // Verificar se já foi usado
      if (data.is_used) {
        return {
          valid: false,
          discount: 0,
          message: '❌ Cupom já foi utilizado',
        };
      }

      // Verificar validade
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return {
          valid: false,
          discount: 0,
          message: '❌ Cupom expirado',
        };
      }

      return {
        valid: true,
        discount: data.discount_percentage,
        message: `✅ Cupom válido! ${data.discount_percentage}% de desconto`,
      };
    } catch (error) {
      console.error('Erro em validateAndUseCoupon:', error);
      return {
        valid: false,
        discount: 0,
        message: '❌ Erro ao validar cupom',
      };
    }
  },

  markCouponAsUsed: async (couponCode: string, customerId?: string) => {
    try {
      const now = new Date().toISOString();

      const { error } = await (supabase as any)
        .from('loyalty_coupons')
        .update({
          is_used: true,
          used_at: now,
        })
        .eq('coupon_code', couponCode.toUpperCase());

      if (error) {
        console.error('Erro ao marcar cupom como usado:', error);
        return false;
      }

      // Atualizar lista
      await get().getCoupons();
      return true;
    } catch (error) {
      console.error('Erro em markCouponAsUsed:', error);
      return false;
    }
  },

  deactivateCoupon: async (couponId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('loyalty_coupons')
        .update({ is_active: false })
        .eq('id', couponId);

      if (error) {
        console.error('Erro ao desativar cupom:', error);
        return false;
      }

      await get().getCoupons();
      return true;
    } catch (error) {
      console.error('Erro em deactivateCoupon:', error);
      return false;
    }
  },
}));
