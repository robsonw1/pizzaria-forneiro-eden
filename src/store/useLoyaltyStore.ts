import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useLoyaltySettingsStore } from './useLoyaltySettingsStore';

export interface Customer {
  id: string;
  email: string;
  cpf?: string;
  name?: string;
  phone?: string;
  totalPoints: number;
  totalSpent: number;
  totalPurchases: number;
  isRegistered: boolean;
  registeredAt?: string;
  createdAt: string;
  lastPurchaseAt?: string;
  // Endereço padrão de entrega
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  zipCode?: string;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  orderId?: string;
  pointsEarned?: number;
  pointsSpent?: number;
  transactionType: 'purchase' | 'redemption' | 'signup_bonus';
  description: string;
  createdAt: string;
}

export interface LoyaltyCoupon {
  id: string;
  customerId: string;
  couponCode: string;
  discountPercentage?: number;
  discountAmount?: number;
  pointsThreshold: number;
  isActive: boolean;
  isUsed: boolean;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ReferralProgram {
  id: string;
  referrerId: string;
  referralCode: string;
  referralEmail?: string;
  referredCustomerId?: string;
  status: 'pending' | 'completed' | 'expired';
  referrerPointsEarned: number;
  referredPointsEarned: number;
  bonusPoints: number;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

interface LoyaltyStore {
  currentCustomer: Customer | null;
  points: number;
  pointsToRedeem: number;
  transactions: LoyaltyTransaction[];
  coupons: LoyaltyCoupon[];
  activeCoupon: LoyaltyCoupon | null;
  referrals: ReferralProgram[];
  referralCode: string;
  isRemembered: boolean;
  
  // Actions
  findOrCreateCustomer: (email: string) => Promise<Customer | null>;
  registerCustomer: (email: string, cpf: string, name: string, phone?: string) => Promise<boolean>;
  addPointsFromPurchase: (customerId: string, amount: number, orderId: string, pointsRedeemed?: number) => Promise<void>;
  addSignupBonus: (customerId: string) => Promise<void>;
  redeemPoints: (customerId: string, pointsToSpend: number) => Promise<{ success: boolean; discountAmount: number }>;
  getCustomerByEmail: (email: string) => Promise<Customer | null>;
  setCurrentCustomer: (customer: Customer | null) => void;
  setPointsToRedeem: (points: number) => void;
  getTransactionHistory: (customerId: string) => Promise<LoyaltyTransaction[]>;
  refreshCurrentCustomer: () => Promise<void>;
  
  // Login/Logout
  loginCustomer: (email: string, cpf: string, rememberMe?: boolean) => Promise<boolean>;
  logoutCustomer: () => Promise<void>;
  restoreRememberedLogin: () => Promise<boolean>;
  saveDefaultAddress: (address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    zipCode: string;
  }) => Promise<boolean>;
  
  // Coupon actions
  generateAutoCoupon: (customerId: string) => Promise<LoyaltyCoupon | null>;
  getCoupons: (customerId: string) => Promise<LoyaltyCoupon[]>;
  useCoupon: (couponId: string) => Promise<boolean>;
  
  // Referral actions
  generateReferralCode: (customerId: string) => Promise<string>;
  getReferralCode: (customerId: string) => Promise<string>;
  registerReferralCode: (referralCode: string, referredCustomerId: string) => Promise<boolean>;
  completeReferralFromPurchase: (referredCustomerId: string) => Promise<void>;
  getReferrals: (customerId: string) => Promise<ReferralProgram[]>;
}

const getPointsPerReal = () => useLoyaltySettingsStore.getState().settings?.pointsPerReal ?? 1;
const getPointsValue = () => useLoyaltySettingsStore.getState().settings?.discountPer100Points ?? 5;
const getSignupBonusPoints = () => useLoyaltySettingsStore.getState().settings?.signupBonusPoints ?? 50;
const getReferralBonusPoints = () => useLoyaltySettingsStore.getState().settings?.referralBonusPoints ?? 100;
const getMinPointsToRedeem = () => useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50;

// Helper para obter hora local em formato ISO string sem timezone
const getLocalISOString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}`;
};

export const useLoyaltyStore = create<LoyaltyStore>((set, get) => ({
  currentCustomer: null,
  points: 0,
  pointsToRedeem: 0,
  transactions: [],
  coupons: [],
  activeCoupon: null,
  referrals: [],
  referralCode: '',
  isRemembered: false,

  findOrCreateCustomer: async (email: string) => {
    try {
      // Procurar cliente existente
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar cliente:', error);
        return null;
      }

      if (data) {
        const customer = mapCustomerFromDB(data);
        set({ currentCustomer: customer, points: customer.totalPoints });
        return customer;
      }

      // Criar novo cliente não registrado
      const { data: newCustomer, error: createError } = await (supabase as any)
        .from('customers')
        .insert([{ email, is_registered: false, created_at: new Date() }])
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar cliente:', createError);
        return null;
      }

      const customer = mapCustomerFromDB(newCustomer);
      set({ currentCustomer: customer, points: 0 });
      return customer;
    } catch (error) {
      console.error('Erro em findOrCreateCustomer:', error);
      return null;
    }
  },

  registerCustomer: async (email: string, cpf: string, name: string, phone?: string) => {
    try {
      console.log('registerCustomer chamado com:', { email, cpf, name, phone });

      // Usar UPSERT para garantir que os dados sejam salvos mesmo se o email for diferente
      const { data, error } = await (supabase as any)
        .from('customers')
        .upsert(
          {
            email,
            cpf,
            name,
            phone: phone || null,
            is_registered: true,
            registered_at: getLocalISOString(),
          },
          { onConflict: 'email' }
        )
        .select()
        .single();

      if (error) {
        console.error('Erro ao registrar cliente (upsert):', error);
        return false;
      }

      console.log('Cliente registrado com sucesso:', data);

      // Adicionar bônus de signup
      await get().addSignupBonus(email);

      // Recarregar dados do cliente
      const customer = await get().getCustomerByEmail(email);
      if (customer) {
        set({ currentCustomer: customer, points: customer.totalPoints });
      }

      return true;
    } catch (error) {
      console.error('Erro em registerCustomer:', error);
      return false;
    }
  },

  addSignupBonus: async (emailOrId: string) => {
    try {
      // Procurar cliente por email ou id
      let customerId: string;
      
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('id, total_points, received_signup_bonus')
        .eq(emailOrId.includes('@') ? 'email' : 'id', emailOrId)
        .single();

      if (error || !data) {
        console.error('Cliente não encontrado para bônus:', error);
        return;
      }

      customerId = data.id;

      // Verificar se já recebeu bônus
      if (data.received_signup_bonus) {
        console.log('ℹ️ Cliente já recebeu bônus de signup');
        return;
      }

      const signupBonus = getSignupBonusPoints();
      
      // Calcular data de expiração dos pontos
      const expirationDays = useLoyaltySettingsStore.getState().settings?.pointsExpirationDays ?? 365;
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expirationDays);
      const expiresAtISO = expiresAtDate.toISOString();

      // Adicionar pontos ao total existente
      const newTotalPoints = (data.total_points || 0) + signupBonus;

      // Atualizar pontos e marcar como recebido
      await (supabase as any)
        .from('customers')
        .update({ 
          total_points: newTotalPoints,
          received_signup_bonus: true,
        })
        .eq('id', customerId);

      // Registrar transação com hora local e data de expiração
      await (supabase as any)
        .from('loyalty_transactions')
        .insert([{
          customer_id: customerId,
          points_earned: signupBonus,
          transaction_type: 'signup_bonus',
          description: `Bônus de cadastro - ${signupBonus} pontos`,
          created_at: getLocalISOString(),
          expires_at: expiresAtISO,
        }]);

      console.log('✅ Bônus de signup adicionado:', signupBonus, 'pontos | Total:', newTotalPoints);
    } catch (error) {
      console.error('Erro em addSignupBonus:', error);
    }
  },

  addPointsFromPurchase: async (customerId: string, amount: number, orderId: string, pointsRedeemed: number = 0) => {
    try {
      // Se cliente usou pontos para desconto, não ganha pontos nesta compra
      if (pointsRedeemed > 0) {
        console.log('⏭️ Pontos para compra NÃO adicionados (cliente usou desconto de pontos nesta compra)');
        return;
      }

      const pointsPerReal = getPointsPerReal();
      const pointsEarned = Math.floor(amount * pointsPerReal);

      // Buscar pontos atuais do cliente
      const { data: customerData, error: fetchError } = await (supabase as any)
        .from('customers')
        .select('total_points, total_spent, total_purchases')
        .eq('id', customerId)
        .single();

      if (fetchError || !customerData) {
        console.error('Erro ao buscar cliente:', fetchError);
        return;
      }

      const newTotalPoints = (customerData.total_points || 0) + pointsEarned;
      const newTotalSpent = (customerData.total_spent || 0) + amount;
      const newTotalPurchases = (customerData.total_purchases || 0) + 1;
      const isFirstPurchase = (customerData.total_purchases || 0) === 0;

      const localISO = getLocalISOString();

      // Calcular data de expiração dos pontos
      const expirationDays = useLoyaltySettingsStore.getState().settings?.pointsExpirationDays ?? 365;
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expirationDays);
      const expiresAtISO = expiresAtDate.toISOString();

      // Atualizar total de pontos e gasto
      await (supabase as any)
        .from('customers')
        .update({
          total_points: newTotalPoints,
          total_spent: newTotalSpent,
          total_purchases: newTotalPurchases,
          last_purchase_at: localISO,
        })
        .eq('id', customerId);

      // Registrar transação com hora local e data de expiração
      await (supabase as any)
        .from('loyalty_transactions')
        .insert([{
          customer_id: customerId,
          order_id: orderId,
          points_earned: pointsEarned,
          transaction_type: 'purchase',
          description: `Compra no valor de R$ ${amount.toFixed(2)} - ${pointsEarned} pontos`,
          created_at: localISO,
          expires_at: expiresAtISO,
        }]);

      // Se é primeira compra, validar e completar referral pendente
      if (isFirstPurchase) {
        console.log('🎁 Primeira compra! Verificando referrals pendentes...');
        await get().completeReferralFromPurchase(customerId);
      }

      // Nota: Cupons agora são gerados manualmente pelo admin via painel de controle

      console.log('✅ Pontos adicionados:', pointsEarned, '| Total:', newTotalPoints);
    } catch (error) {
      console.error('Erro em addPointsFromPurchase:', error);
    }
  },

  redeemPoints: async (customerId: string, pointsToSpend: number) => {
    try {
      // Validar pontos suficientes
      const customer = get().currentCustomer;
      if (!customer || customer.totalPoints < pointsToSpend) {
        return { success: false, discountAmount: 0 };
      }

      // Calcular desconto (100 pontos = configuração dinâmica)
      const pointsValue = getPointsValue();
      const discountAmount = (pointsToSpend / 100) * pointsValue;

      // Atualizar pontos
      await (supabase as any)
        .from('customers')
        .update({
          total_points: customer.totalPoints - pointsToSpend,
        })
        .eq('id', customerId);

      // Registrar transação com hora local
      await (supabase as any)
        .from('loyalty_transactions')
        .insert([{
          customer_id: customerId,
          points_spent: pointsToSpend,
          transaction_type: 'redemption',
          description: `Resgate de ${pointsToSpend} pontos - Desconto de R$ ${discountAmount.toFixed(2)}`,
          created_at: getLocalISOString(),
        }]);

      console.log('✅ Pontos resgatados:', pointsToSpend, 'pontos = R$', discountAmount);
      return { success: true, discountAmount };
    } catch (error) {
      console.error('Erro em redeemPoints:', error);
      return { success: false, discountAmount: 0 };
    }
  },

  getCustomerByEmail: async (email: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) return null;
      return mapCustomerFromDB(data);
    } catch (error) {
      console.error('Erro em getCustomerByEmail:', error);
      return null;
    }
  },

  setCurrentCustomer: (customer: Customer | null) => {
    set({ 
      currentCustomer: customer,
      points: customer?.totalPoints || 0,
    });
  },

  setPointsToRedeem: (points: number) => {
    set({ pointsToRedeem: points });
  },

  refreshCurrentCustomer: async () => {
    try {
      const state = get();
      if (!state.currentCustomer?.id) {
        console.log('Nenhum cliente logado para refrescar');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('id', state.currentCustomer.id)
        .single();

      if (!error && data) {
        const customer = mapCustomerFromDB(data);
        set({
          currentCustomer: customer,
          points: customer.totalPoints,
        });
        console.log('✅ Dados do cliente atualizados:', customer.totalPoints, 'pontos');
      }
    } catch (error) {
      console.error('Erro ao refrescar cliente:', error);
    }
  },

  loginCustomer: async (email: string, cpf: string, rememberMe?: boolean) => {
    try {
      console.log('Tentando fazer login com:', { email, cpf, rememberMe });

      // Buscar cliente por email e CPF
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('cpf', cpf.replace(/\D/g, ''))
        .single();

      if (error || !data) {
        console.error('Cliente não encontrado:', error);
        return false;
      }

      const customer = mapCustomerFromDB(data);
      
      // Carregar dados do cliente
      const [transactions, coupons, referrals] = await Promise.all([
        get().getTransactionHistory(customer.id),
        get().getCoupons(customer.id),
        get().getReferrals(customer.id),
      ]);

      // Se rememberMe está ativado, salvar credenciais no localStorage
      if (rememberMe) {
        localStorage.setItem('loyalty_remembered_login', JSON.stringify({
          email,
          cpf,
          timestamp: Date.now(),
        }));
      } else {
        localStorage.removeItem('loyalty_remembered_login');
      }

      set({
        currentCustomer: customer,
        points: customer.totalPoints,
        transactions,
        coupons,
        referrals,
        isRemembered: !!rememberMe,
      });

      console.log('✅ Login bem-sucedido:', customer, '| Remembered:', rememberMe);
      return true;
    } catch (error) {
      console.error('Erro em loginCustomer:', error);
      return false;
    }
  },

  restoreRememberedLogin: async () => {
    try {
      const remembered = localStorage.getItem('loyalty_remembered_login');
      if (!remembered) {
        console.log('ℹ️ Nenhum login lembrado encontrado');
        return false;
      }

      const { email, cpf } = JSON.parse(remembered);
      console.log('🔄 Restaurando login lembrado:', email);

      const success = await get().loginCustomer(email, cpf, true);
      if (success) {
        set({ isRemembered: true });
      }
      return success;
    } catch (error) {
      console.error('Erro ao restaurar login lembrado:', error);
      localStorage.removeItem('loyalty_remembered_login');
      return false;
    }
  },

  logoutCustomer: async () => {
    console.log('Fazendo logout do cliente');
    localStorage.removeItem('loyalty_remembered_login');
    set({
      currentCustomer: null,
      points: 0,
      pointsToRedeem: 0,
      transactions: [],
      coupons: [],
      activeCoupon: null,
      referrals: [],
      referralCode: '',
      isRemembered: false,
    });
  },

  saveDefaultAddress: async (address) => {
    try {
      const state = get();
      if (!state.currentCustomer?.id) {
        console.error('Nenhum cliente logado para salvar endereço');
        return false;
      }

      const { error, data } = await (supabase as any)
        .from('customers')
        .update({
          street: address.street,
          number: address.number,
          complement: address.complement || null,
          neighborhood: address.neighborhood,
          city: address.city,
          zip_code: address.zipCode,
        })
        .eq('id', state.currentCustomer.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar endereço:', error);
        return false;
      }

      // Atualizar currentCustomer com o novo endereço
      const customer = mapCustomerFromDB(data);
      set({ currentCustomer: customer });
      console.log('✅ Endereço padrão salvo com sucesso');
      return true;
    } catch (error) {
      console.error('Erro em saveDefaultAddress:', error);
      return false;
    }
  },

  getTransactionHistory: async (customerId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('loyalty_transactions')
        .select('id, customer_id, order_id, points_earned, points_spent, transaction_type, description, created_at, expires_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      const transactions = data.map(mapTransactionFromDB);
      set({ transactions });
      return transactions;
    } catch (error) {
      console.error('Erro em getTransactionHistory:', error);
      return [];
    }
  },

  generateAutoCoupon: async (customerId: string) => {
    try {
      const couponCode = `TIER${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const { data, error } = await (supabase as any)
        .from('loyalty_coupons')
        .insert([{
          customer_id: customerId,
          coupon_code: couponCode,
          discount_percentage: 10,
          points_threshold: 100,
          is_active: true,
          is_used: false,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao gerar cupom:', error);
        return null;
      }

      console.log('✅ Cupom auto-gerado:', couponCode);
      return mapCouponFromDB(data);
    } catch (error) {
      console.error('Erro em generateAutoCoupon:', error);
      return null;
    }
  },

  getCoupons: async (customerId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('loyalty_coupons')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      set({ coupons: data });
      return data.map(mapCouponFromDB);
    } catch (error) {
      console.error('Erro em getCoupons:', error);
      return [];
    }
  },

  useCoupon: async (couponId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('loyalty_coupons')
        .update({ is_used: true, used_at: getLocalISOString() })
        .eq('id', couponId);

      if (error) {
        console.error('Erro ao usar cupom:', error);
        return false;
      }

      console.log('✅ Cupom utilizado:', couponId);
      return true;
    } catch (error) {
      console.error('Erro em useCoupon:', error);
      return false;
    }
  },

  generateReferralCode: async (customerId: string) => {
    try {
      const referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const referralBonusPoints = getReferralBonusPoints();
      
      const { data, error } = await (supabase as any)
        .from('referral_program')
        .insert([{
          referrer_id: customerId,
          referral_code: referralCode,
          status: 'pending',
          bonus_points: referralBonusPoints,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao gerar código de referência:', error);
        return '';
      }

      set({ referralCode });
      console.log('✅ Código de referência gerado:', referralCode);
      return referralCode;
    } catch (error) {
      console.error('Erro em generateReferralCode:', error);
      return '';
    }
  },

  getReferralCode: async (customerId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('referral_program')
        .select('referral_code')
        .eq('referrer_id', customerId)
        .single();

      if (error || !data) {
        // Se não existe, gerar novo
        return await get().generateReferralCode(customerId);
      }

      set({ referralCode: data.referral_code });
      return data.referral_code;
    } catch (error) {
      console.error('Erro em getReferralCode:', error);
      return '';
    }
  },

  registerReferralCode: async (referralCode: string, referredCustomerId: string) => {
    try {
      // Buscar o referral program
      const { data: referralData, error: referralError } = await (supabase as any)
        .from('referral_program')
        .select('*')
        .eq('referral_code', referralCode)
        .single();

      if (referralError || !referralData) {
        console.error('Código de referência inválido');
        return false;
      }

      // Marca como pending ao usar o código
      const { error: updateError } = await (supabase as any)
        .from('referral_program')
        .update({
          referred_customer_id: referredCustomerId,
          status: 'pending', // Espera primeira compra
        })
        .eq('id', referralData.id);

      if (updateError) {
        console.error('Erro ao registrar código de referência:', updateError);
        return false;
      }

      console.log('✅ Código de referência registrado como pending');
      return true;
    } catch (error) {
      console.error('Erro em registerReferralCode:', error);
      return false;
    }
  },

  completeReferralFromPurchase: async (referredCustomerId: string) => {
    try {
      // Buscar referral pendente para este cliente
      const { data: referralData, error: referralError } = await (supabase as any)
        .from('referral_program')
        .select('*')
        .eq('referred_customer_id', referredCustomerId)
        .eq('status', 'pending')
        .single();

      if (referralError || !referralData) {
        // Sem referral pendente é normal, apenas não faz nada
        console.log('ℹ️ Nenhum referral pendente para este cliente');
        return;
      }

      const referrerId = referralData.referrer_id;

      // Buscar pontos atuais de ambos
      const { data: referrerData } = await (supabase as any)
        .from('customers')
        .select('total_points')
        .eq('id', referrerId)
        .single();

      const { data: referredData } = await (supabase as any)
        .from('customers')
        .select('total_points')
        .eq('id', referredCustomerId)
        .single();

      // Atualizar referral como completed
      const referralBonusPoints = getReferralBonusPoints();
      const { error: updateError } = await (supabase as any)
        .from('referral_program')
        .update({
          status: 'completed',
          completed_at: getLocalISOString(),
          referrer_points_earned: referralBonusPoints,
          referred_points_earned: 50,
        })
        .eq('id', referralData.id);

      if (updateError) {
        console.error('Erro ao completar referral:', updateError);
        return;
      }

      // Adicionar pontos ao referenciador
      const referralBonusPoints2 = getReferralBonusPoints();
      const referrerNewPoints = (referrerData?.total_points || 0) + referralBonusPoints2;
      await (supabase as any)
        .from('customers')
        .update({ total_points: referrerNewPoints })
        .eq('id', referrerId);

      // Adicionar pontos ao referido
      const referredNewPoints = (referredData?.total_points || 0) + 50;
      await (supabase as any)
        .from('customers')
        .update({ total_points: referredNewPoints })
        .eq('id', referredCustomerId);

      // Registrar transações com hora local
      const referralBonusPoints3 = getReferralBonusPoints();
      const localISO = getLocalISOString();

      await (supabase as any)
        .from('loyalty_transactions')
        .insert([
          {
            customer_id: referrerId,
            points_earned: referralBonusPoints3,
            transaction_type: 'signup_bonus',
            description: `Seu amigo completou a primeira compra! ${referralBonusPoints3} pontos de referência`,
            created_at: localISO,
          },
          {
            customer_id: referredCustomerId,
            points_earned: 50,
            transaction_type: 'signup_bonus',
            description: `Foi indicado e fez a primeira compra! 50 pontos de bônus`,
            created_at: localISO,
          }
        ]);

      console.log('🎉 Referral completado na primeira compra! Pontos dados a ambos');
    } catch (error) {
      console.error('Erro em completeReferralFromPurchase:', error);
    }
  },

  getReferrals: async (customerId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('referral_program')
        .select('*')
        .eq('referrer_id', customerId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      set({ referrals: data });
      return data.map(mapReferralFromDB);
    } catch (error) {
      console.error('Erro em getReferrals:', error);
      return [];
    }
  },
}));

// Helper para mapear dados do DB
function mapCustomerFromDB(data: any): Customer {
  return {
    id: data.id,
    email: data.email,
    cpf: data.cpf,
    name: data.name,
    phone: data.phone,
    totalPoints: data.total_points || 0,
    totalSpent: data.total_spent || 0,
    totalPurchases: data.total_purchases || 0,
    isRegistered: data.is_registered || false,
    registeredAt: data.registered_at,
    createdAt: data.created_at,
    lastPurchaseAt: data.last_purchase_at,
    // Endereço padrão
    street: data.street,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city: data.city,
    zipCode: data.zip_code,
  };
}

function mapTransactionFromDB(data: any): LoyaltyTransaction {
  return {
    id: data.id,
    customerId: data.customer_id,
    orderId: data.order_id,
    pointsEarned: data.points_earned,
    pointsSpent: data.points_spent,
    transactionType: data.transaction_type,
    description: data.description,
    createdAt: data.created_at,
  };
}

function mapCouponFromDB(data: any): LoyaltyCoupon {
  return {
    id: data.id,
    customerId: data.customer_id,
    couponCode: data.coupon_code,
    discountPercentage: data.discount_percentage,
    discountAmount: data.discount_amount,
    pointsThreshold: data.points_threshold,
    isActive: data.is_active,
    isUsed: data.is_used,
    usedAt: data.used_at,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

function mapReferralFromDB(data: any): ReferralProgram {
  return {
    id: data.id,
    referrerId: data.referrer_id,
    referralCode: data.referral_code,
    referralEmail: data.referral_email,
    referredCustomerId: data.referred_customer_id,
    status: data.status,
    referrerPointsEarned: data.referrer_points_earned,
    referredPointsEarned: data.referred_points_earned,
    bonusPoints: data.bonus_points,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    expiresAt: data.expires_at,
  };
}
