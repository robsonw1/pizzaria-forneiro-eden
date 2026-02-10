import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUIStore, useCartStore, useCheckoutStore } from '@/store/useStore';
import { useNeighborhoodsStore } from '@/store/useNeighborhoodsStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { useLoyaltySettingsStore } from '@/store/useLoyaltySettingsStore';
import { useCouponManagementStore } from '@/store/useCouponManagementStore';
import { supabase } from '@/integrations/supabase/client';
import { PostCheckoutLoyaltyModal } from './PostCheckoutLoyaltyModal';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  Truck, 
  Store, 
  CreditCard, 
  QrCode,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Banknote,
  Copy,
  Check,
  AlertCircle,
  Gift,
  XCircle,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'contact' | 'address' | 'delivery' | 'payment' | 'pix' | 'confirmation';

interface PixData {
  qrCode: string;
  qrCodeBase64: string;
  paymentId: string;
  expirationDate: string;
}

export function CheckoutModal() {
  const { isCheckoutOpen, setCheckoutOpen, setCartOpen } = useUIStore();
  const { items, getSubtotal, clearCart } = useCartStore();
  const {
    customer,
    address,
    deliveryType,
    paymentMethod,
    observations,
    selectedNeighborhood,
    needsChange,
    changeAmount,
    saveAsDefault,
    pointsToRedeem,
    setCustomer,
    setAddress,
    setDeliveryType,
    setPaymentMethod,
    setObservations,
    setSelectedNeighborhood,
    setNeedsChange,
    setChangeAmount,
    setSaveAsDefault,
    setPointsToRedeem,
    calculatePointsDiscount,
    getDeliveryFee,
    reset,
  } = useCheckoutStore();

  const neighborhoods = useNeighborhoodsStore((s) => s.neighborhoods);
  const activeNeighborhoods = neighborhoods.filter(n => n.isActive);
  const addOrder = useOrdersStore((s) => s.addOrder);
  const settings = useSettingsStore((s) => s.settings);
  const isStoreOpen = useSettingsStore((s) => s.isStoreOpen);

  const [step, setStep] = useState<Step>('contact');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [lastOrderEmail, setLastOrderEmail] = useState<string>('');
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);
  const [lastPointsDiscount, setLastPointsDiscount] = useState<number>(0);
  const [lastPointsRedeemed, setLastPointsRedeemed] = useState<number>(0);
  const [lastFinalTotal, setLastFinalTotal] = useState<number>(0);
  const [lastAppliedCoupon, setLastAppliedCoupon] = useState<string>('');
  const [lastCouponDiscount, setLastCouponDiscount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [couponValidationMessage, setCouponValidationMessage] = useState<string>('');

  const validateAndUseCoupon = useCouponManagementStore((s) => s.validateAndUseCoupon);
  const markCouponAsUsed = useCouponManagementStore((s) => s.markCouponAsUsed);
  const findOrCreateCustomer = useLoyaltyStore((s) => s.findOrCreateCustomer);
  const addPointsFromPurchase = useLoyaltyStore((s) => s.addPointsFromPurchase);
  const refreshCurrentCustomer = useLoyaltyStore((s) => s.refreshCurrentCustomer);
  const saveDefaultAddress = useLoyaltyStore((s) => s.saveDefaultAddress);
  const redeemPoints = useLoyaltyStore((s) => s.redeemPoints);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const isRemembered = useLoyaltyStore((s) => s.isRemembered);

  // Pré-preencher dados de contato quando cliente logado abre checkout
  useEffect(() => {
    if (isCheckoutOpen && currentCustomer && isRemembered) {
      if (currentCustomer.name && !customer.name) {
        setCustomer({ name: currentCustomer.name });
      }
      if (currentCustomer.phone && !customer.phone) {
        setCustomer({ phone: currentCustomer.phone });
      }
    }
  }, [isCheckoutOpen, currentCustomer?.name, currentCustomer?.phone, isRemembered]);

  // Pré-preencher endereço salvo quando checkout abre
  useEffect(() => {
    if (isCheckoutOpen && currentCustomer?.street && !address.street) {
      setAddress({
        street: currentCustomer.street,
        number: currentCustomer.number || '',
        complement: currentCustomer.complement || '',
        reference: '',
        city: currentCustomer.city || '',
        zipCode: currentCustomer.zipCode || '',
      });

      // Pre-select neighborhood
      if (currentCustomer.neighborhood) {
        const matchingNeighborhood = activeNeighborhoods.find(
          (n) => n.name === currentCustomer.neighborhood
        );
        if (matchingNeighborhood) {
          setSelectedNeighborhood(matchingNeighborhood);
        }
      }

      // Se tem endereço padrão, marca como salvo
      if (currentCustomer.street) {
        setSaveAsDefault(true);
      }
    }
  }, [isCheckoutOpen, currentCustomer?.street]);

  // Resetar pontos a resgatar quando checkout abre
  useEffect(() => {
    if (isCheckoutOpen) {
      setPointsToRedeem(0);
    }
  }, [isCheckoutOpen]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponValidationMessage('❌ Digite o código do cupom');
      return;
    }

    if (!isRemembered) {
      setCouponValidationMessage('❌ Apenas clientes registrados podem usar cupons');
      return;
    }

    const result = await validateAndUseCoupon(couponCode.toUpperCase(), currentCustomer?.id);
    
    if (result.valid) {
      setAppliedCoupon(couponCode.toUpperCase());
      setCouponDiscount(result.discount);
      setCouponValidationMessage(`✅ ${result.message}`);
      toast.success(result.message);
    } else {
      setCouponDiscount(0);
      setAppliedCoupon('');
      setCouponValidationMessage(result.message);
      toast.error(result.message);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon('');
    setCouponDiscount(0);
    setCouponValidationMessage('');
  };

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3) formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length > 6) formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    if (cleaned.length > 9) formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    return formatted;
  };

  const handleCpfInput = (value: string) => {
    setCustomer({ cpf: formatCpf(value) });
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'contact':
        if (!customer.name.trim()) {
          toast.error('Por favor, informe seu nome');
          return false;
        }
        if (!customer.phone.trim() || customer.phone.length < 14) {
          toast.error('Por favor, informe um telefone válido');
          return false;
        }
        return true;
      case 'delivery':
        // Always valid - customer just needs to choose
        return true;
      case 'address':
        // Skip validation if pickup
        if (deliveryType === 'pickup') return true;
        // Validate address fields only for delivery
        if (!address.street || !address.number || !selectedNeighborhood) {
          toast.error('Por favor, preencha o endereço completo');
          return false;
        }
        return true;
      case 'payment':
        // CPF é obrigatório APENAS para PIX
        if (paymentMethod === 'pix') {
          if (!customer.cpf || customer.cpf.replace(/\D/g, '').length !== 11) {
            toast.error('Por favor, informe um CPF válido para PIX');
            return false;
          }
        }
        if (paymentMethod === 'cash' && needsChange && !changeAmount) {
          toast.error('Por favor, informe o valor para troco');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const baseSteps: Step[] = ['contact', 'delivery', 'address', 'payment'];
    
    // Skip address step if pickup
    let steps = baseSteps;
    if (deliveryType === 'pickup') {
      steps = ['contact', 'delivery', 'payment'];
    }
    
    const currentIndex = steps.indexOf(step as any);
    
    if (!validateStep(step)) return;
    
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const baseSteps: Step[] = ['contact', 'delivery', 'address', 'payment'];
    
    // Skip address step if pickup
    let steps = baseSteps;
    if (deliveryType === 'pickup') {
      steps = ['contact', 'delivery', 'payment'];
    }
    
    const currentIndex = steps.indexOf(step as any);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handlePhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 2) {
      formatted = `(${cleaned.slice(0, 2)}`;
    }
    if (cleaned.length >= 3) {
      formatted += `) ${cleaned.slice(2, 7)}`;
    }
    if (cleaned.length >= 8) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    
    setCustomer({ phone: formatted });
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const buildOrderPayload = (orderId: string) => {
    const paymentMethodMap = {
      pix: 'pix',
      card: 'cartao_maquina',
      cash: 'dinheiro'
    };

    // Build simplified items array
    const formattedItems = items.map(item => {
      const isPizza = ['promocionais', 'tradicionais', 'premium', 'especiais', 'doces'].includes(item.product.category);
      const isCombo = item.product.category === 'combos';

      // Build item_data JSON with complete information
      const itemData = {
        pizzaType: isPizza ? (item.isHalfHalf ? 'meia-meia' : 'inteira') : undefined,
        sabor1: isPizza ? item.product.name : undefined,
        sabor2: isPizza && item.isHalfHalf ? item.secondHalf?.name : undefined,
        borda: item.border?.name || 'Sem borda',
        extras: item.extras?.map(e => e.name) || [],
        drink: item.drink?.name || 'Sem bebida',
        customIngredients: item.customIngredients || null,
        comboPizzas: isCombo ? item.comboPizzaFlavors?.map((pizza: any, index: number) => ({
          pizzaNumber: index + 1,
          type: pizza.isHalfHalf ? 'meia-meia' : 'inteira',
          sabor1: pizza.name,
          sabor2: pizza.isHalfHalf ? pizza.secondHalf?.name : undefined,
        })) : undefined,
      };

      return {
        order_id: null, // Will be set by backend
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        size: item.size || 'padrão',
        total_price: item.totalPrice,
        item_data: itemData,
        created_at: new Date().toISOString(),
      };
    });

    return {
      orderId,
      timestamp: new Date().toISOString(),
      
      // Customer info
      customer: {
        name: customer.name,
        phone: customer.phone,
        phoneClean: customer.phone.replace(/\D/g, ''),
        cpf: customer.cpf,
      },
      
      // Delivery info
      delivery: {
        type: deliveryType === 'delivery' ? 'ENTREGA' : 'RETIRADA',
        fee: deliveryFee,
        estimatedTime: deliveryType === 'delivery' 
          ? `${settings.deliveryTimeMin}-${settings.deliveryTimeMax} min`
          : `${settings.pickupTimeMin}-${settings.pickupTimeMax} min`,
        ...(deliveryType === 'delivery' && {
          address: {
            street: address.street,
            number: address.number,
            complement: address.complement || '',
            neighborhood: selectedNeighborhood?.name || address.neighborhood,
            city: address.city || 'São Paulo',
            state: 'SP',
            zipcode: address.zipCode,
            reference: address.reference || '',
          },
        }),
      },
      
      // Payment info
      payment: {
        method: paymentMethodMap[paymentMethod],
        methodLabel: paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'card' ? 'Cartão' : 'Dinheiro',
        status: paymentMethod === 'pix' ? 'aguardando_pagamento' : 'pendente',
        needsChange: paymentMethod === 'cash' ? needsChange : false,
        changeFor: paymentMethod === 'cash' && needsChange ? parseFloat(changeAmount) || 0 : null,
      },
      
      // Items
      items: formattedItems,
      
      // Totals
      totals: {
        subtotal,
        deliveryFee,
        total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        pointsDiscount: 0,
        pointsRedeemed: 0,
        couponDiscount: 0,
        appliedCoupon: '',
      },
      couponDiscount: 0,
      appliedCoupon: undefined,
      
      // Observations
      observations: observations || '',
    };
  };

  const processOrder = async (orderPayload: any, pointsDiscount: number = 0, pointsRedeemed: number = 0) => {
    console.log('Processando pedido...', { pointsDiscount, pointsRedeemed });
    
    // Determinar se deve auto-imprimir baseado em modo e método de pagamento
    let shouldAutoPrint = false;
    
    // SÓ usar auto-print se o modo for "auto" (não "manual")
    if (settings.print_mode === 'auto') {
      if (paymentMethod === 'pix' && settings.auto_print_pix) {
        shouldAutoPrint = true;
      } else if (paymentMethod === 'card' && settings.auto_print_card) {
        shouldAutoPrint = true;
      } else if (paymentMethod === 'cash' && settings.auto_print_cash) {
        shouldAutoPrint = true;
      }
    }
    
    if (shouldAutoPrint) {
      console.log('Auto-print habilitado para:', paymentMethod);
    } else {
      console.log('Auto-print desabilitado para:', paymentMethod);
    }
    
    // 🔒 CRÍTICO: Marcar cupom como usado ANTES de criar pedido (transação atômica)
    if (orderPayload.totals.appliedCoupon) {
      try {
        await markCouponAsUsed(orderPayload.totals.appliedCoupon, currentCustomer?.id);
        console.log('✅ Cupom marcado como usado na criação do pedido');
      } catch (error) {
        // Se cupom falhar, ainda registra o pedido mas avisa
        console.warn('⚠️ Falha ao marcar cupom, mas pedido será criado:', error);
      }
    }
    
    // Add order to local store for admin panel
    // (addOrder function handles auto-print with retry logic based on shouldAutoPrint parameter)
    const createdOrder = await addOrder({
      customer: {
        name: customer.name,
        phone: customer.phone,
      },
      address: {
        city: address.city || 'São Paulo',
        neighborhood: selectedNeighborhood?.name || address.neighborhood,
        street: address.street,
        number: address.number,
        complement: address.complement,
        reference: address.reference,
      },
      deliveryType,
      deliveryFee,
      paymentMethod,
      items,
      subtotal,
      total: orderPayload.totals.total, // Use final total from payload
      pointsDiscount: pointsDiscount,
      pointsRedeemed: pointsRedeemed,
      couponDiscount: orderPayload.totals.couponDiscount,
      appliedCoupon: orderPayload.totals.appliedCoupon,
      status: 'pending',
      observations,
    }, shouldAutoPrint);
    
    console.log('Pedido criado com ID:', createdOrder.id);
  };

  const handleSubmitOrder = async () => {
    if (!storeOpen) {
      toast.error('Estabelecimento fechado. Não é possível fazer pedidos no momento.');
      return;
    }
    if (!validateStep('payment')) return;
    
    setIsProcessing(true);
    const orderId = `PED-${Date.now().toString().slice(-5)}`;
    
    // Calculate final total with points discount and coupon discount
    const minPointsRequired = useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50;
    const validPointsToRedeem = pointsToRedeem >= minPointsRequired ? pointsToRedeem : 0;
    const pointsDiscount = calculatePointsDiscount();
    const couponDiscountAmount = (total * couponDiscount) / 100; // Cupom é percentual
    const finalTotal = total - pointsDiscount - couponDiscountAmount;
    
    // Create payload with final total
    const orderPayload = buildOrderPayload(orderId);
    orderPayload.totals.total = finalTotal;
    if (pointsDiscount > 0) {
      orderPayload.totals.pointsDiscount = pointsDiscount;
      orderPayload.totals.pointsRedeemed = validPointsToRedeem;
    }
    if (couponDiscountAmount > 0) {
      orderPayload.totals.couponDiscount = couponDiscountAmount;
      orderPayload.totals.appliedCoupon = appliedCoupon;
    }

    try {
      // Only create/find customer if they're logged in
      let loyaltyCustomer = null;
      if (isRemembered && currentCustomer?.email) {
        loyaltyCustomer = await findOrCreateCustomer(currentCustomer.email);
        setLastOrderEmail(currentCustomer.email);
      }
      
      // Save address as default if requested and customer exists
      if (saveAsDefault && currentCustomer && deliveryType === 'delivery') {
        try {
          await saveDefaultAddress({
            street: address.street,
            number: address.number,
            complement: address.complement || '',
            neighborhood: selectedNeighborhood?.name || '',
            city: address.city || 'São Paulo',
            zipCode: address.zipCode || '',
          });
        } catch (error) {
          console.error('Erro ao salvar endereço:', error);
          // Don't fail the order if address save fails
        }
      }
      
      if (paymentMethod === 'pix') {
        // Create PIX payment with final total (including points discount)
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago-payment', {
          body: {
            orderId,
            amount: finalTotal,
            description: `Pedido ${orderId} - Forneiro Éden`,
            payerEmail: 'cliente@forneiroeden.com',
            payerName: customer.name,
            payerPhone: customer.phone,
            payerCpf: customer.cpf,
            paymentType: 'pix'
          }
        });

        if (mpError) {
          console.error('Erro ao criar PIX:', mpError);
          throw new Error('Erro ao gerar pagamento PIX');
        }

        console.log('PIX criado:', mpData);

        if (mpData?.qrCode) {
          setPixData({
            qrCode: mpData.qrCode,
            qrCodeBase64: mpData.qrCodeBase64,
            paymentId: mpData.paymentId,
            expirationDate: mpData.expirationDate
          });
          
          // Redeem points if any were selected and meet minimum
          const minPoints = useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50;
          if (validPointsToRedeem > 0 && validPointsToRedeem >= minPoints && loyaltyCustomer) {
            await redeemPoints(loyaltyCustomer.id, validPointsToRedeem);
          }
          
          // Process order (handles Supabase insert + auto-print logic)
          await processOrder(orderPayload, pointsDiscount, validPointsToRedeem);
          
          setStep('pix');
        } else {
          throw new Error('QR Code não gerado');
        }
      } else {
        // For card and cash, just process order directly
        await processOrder(orderPayload, pointsDiscount, validPointsToRedeem);
        
        // Redeem points if any were selected and meet minimum
        const minPoints = useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50;
        if (validPointsToRedeem > 0 && validPointsToRedeem >= minPoints && loyaltyCustomer) {
          await redeemPoints(loyaltyCustomer.id, validPointsToRedeem);
        }
        
        // Add points from purchase (but only if NO points were redeemed for discount)
        if (loyaltyCustomer) {
          const pointsEarned = Math.floor(finalTotal * 1); // 1 ponto por real
          setLastPointsEarned(pointsEarned);
          await addPointsFromPurchase(loyaltyCustomer.id, finalTotal, orderId, validPointsToRedeem);
          // Refrescar dados do cliente se estiver logado
          if (isRemembered) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await refreshCurrentCustomer();
          }
        }
        
        if (pointsDiscount > 0) {
          toast.success(`Pedido enviado! Descontos de ${formatPrice(pointsDiscount)} aplicados.`);
        } else {
          toast.success('Pedido enviado com sucesso!');
        }
        
        // 🔒 Cupom já foi marcado como usado em processOrder (não duplicar aqui)
        // Mark coupon as used if applied
        // [REMOVIDO - já feito em processOrder de forma atômica]
        
        // Store discount info for confirmation display
        setLastPointsDiscount(pointsDiscount);
        setLastPointsRedeemed(validPointsToRedeem);
        setLastCouponDiscount(couponDiscountAmount);
        setLastAppliedCoupon(appliedCoupon);
        setLastFinalTotal(finalTotal);
        
        setStep('confirmation');
        // Show loyalty modal for non-logged customers
        setTimeout(() => setIsLoyaltyModalOpen(true), 500);
      }

    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      toast.error('Erro ao processar pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePixConfirmed = async () => {
    // 🔒 VALIDAÇÃO CRÍTICA: Verificar status do pagamento no Mercado Pago ANTES de adicionar pontos
    if (!pixData?.paymentId) {
      toast.error('ID de pagamento não identificado');
      return;
    }

    setIsProcessing(true);
    try {
      // 1️⃣ VERIFICAR STATUS REAL NO MERCADO PAGO
      const mpCheckResponse = await fetch('/.netlify/functions/mercadopago-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          paymentId: pixData.paymentId
        })
      });

      const mpStatus = await mpCheckResponse.json();
      
      // ❌ Se pagamento NÃO foi aprovado, NÃO adiciona pontos
      if (mpStatus.status !== 'approved') {
        toast.error(`Pagamento não foi aprovado. Status: ${mpStatus.status}`);
        console.warn('❌ PIX não confirmado no Mercado Pago:', mpStatus);
        return;
      }

      console.log('✅ Pagamento confirmado no Mercado Pago:', mpStatus);

      // 2️⃣ AGORA SIM: Calcular desconto e ADICIONAR PONTOS
      const pointsDiscount = calculatePointsDiscount();
      const finalTotal = total - pointsDiscount;
      
      // Calculate validPointsToRedeem (same validation as in handleSubmitOrder)
      const minPointsRequired = useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50;
      const validPointsToRedeem = pointsToRedeem >= minPointsRequired ? pointsToRedeem : 0;
      
      // Only add loyalty points if customer is logged in
      if (isRemembered && currentCustomer?.email) {
        try {
          const loyaltyCustomer = await findOrCreateCustomer(currentCustomer.email);
          setLastOrderEmail(currentCustomer.email);
          
          if (loyaltyCustomer) {
            // Add points from purchase (but only if NO points were redeemed for discount)
            // Note: Points redemption already happened in handleSubmitOrder before PIX generation
            const pointsEarned = Math.floor(finalTotal * 1); // 1 ponto por real
            setLastPointsEarned(pointsEarned);
            await addPointsFromPurchase(loyaltyCustomer.id, finalTotal, lastOrderEmail, validPointsToRedeem);
            // Atualizar dados do cliente
            await new Promise(resolve => setTimeout(resolve, 500));
            await refreshCurrentCustomer();
          }
        } catch (error) {
          console.error('Erro ao adicionar pontos:', error);
          toast.error('Erro ao processar pontos de fidelização');
        }
      }
      
      toast.success('✅ Pedido confirmado com sucesso!');
      
      // Store discount info for confirmation display
      const calculatedCouponDiscount = (total * couponDiscount) / 100;
      setLastPointsDiscount(pointsDiscount);
      setLastPointsRedeemed(validPointsToRedeem);
      setLastCouponDiscount(calculatedCouponDiscount);
      setLastAppliedCoupon(appliedCoupon);
      setLastFinalTotal(finalTotal);
      
      setStep('confirmation');
      setTimeout(() => setIsLoyaltyModalOpen(true), 500);

    } catch (error) {
      console.error('Erro ao confirmar PIX:', error);
      toast.error('Erro ao confirmar pagamento. Verifique o status da sua transação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (step === 'confirmation') {
      clearCart();
      reset();
    }
    setStep('contact');
    setPixData(null);
    setCopied(false);
    setLastPointsEarned(0);
    setLastOrderEmail('');
    setSaveAsDefault(false);
    setLastAppliedCoupon('');
    setLastCouponDiscount(0);
    setPointsToRedeem(0);
    setLastPointsDiscount(0);
    setLastPointsRedeemed(0);
    setLastFinalTotal(0);
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon('');
    setCouponValidationMessage('');
    setCheckoutOpen(false);
  };

  const handleBackToCart = () => {
    setCheckoutOpen(false);
    setCartOpen(true);
  };

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'pix': return 'PIX';
      case 'card': return 'Cartão (na entrega)';
      case 'cash': return needsChange ? `Dinheiro (troco para R$ ${changeAmount})` : 'Dinheiro (sem troco)';
      default: return '';
    }
  };

  const storeOpen = isStoreOpen();

  return (
    <>
      <Dialog open={isCheckoutOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogDescription className="sr-only">
          Formulário de checkout para realizar pedido
        </DialogDescription>
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {step === 'confirmation' ? 'Pedido Confirmado!' : 
                 step === 'pix' ? 'Pagamento PIX' : 
                 'Finalizar Pedido'}
              </DialogTitle>
            </DialogHeader>

            {/* Store Closed Alert */}
            {!storeOpen && step !== 'confirmation' && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estabelecimento fechado.</strong> Não é possível fazer pedidos no momento. 
                  Consulte nosso horário de funcionamento.
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Steps */}
            {!['confirmation', 'pix'].includes(step) && (
              <div className="flex items-center justify-between mt-6 mb-8">
                {['contact', 'delivery', 'address', 'payment'].map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${step === s || ['contact', 'delivery', 'address', 'payment'].indexOf(step as any) > i
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                        }`}
                    >
                      {i + 1}
                    </div>
                    {i < 3 && (
                      <div className={`w-8 md:w-16 h-1 mx-1 rounded
                        ${['contact', 'delivery', 'address', 'payment'].indexOf(step as any) > i
                          ? 'bg-primary'
                          : 'bg-secondary'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 1: Contact */}
              {step === 'contact' && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Dados de Contato
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={customer.name}
                        onChange={(e) => setCustomer({ name: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={customer.phone}
                          onChange={(e) => handlePhoneInput(e.target.value)}
                          className="pl-10"
                          maxLength={15}
                        />
                      </div>
                    </div>


                  </div>
                </motion.div>
              )}

              {/* Step 2: Delivery */}
              {step === 'delivery' && (
                <motion.div
                  key="delivery"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Forma de Entrega
                  </h3>

                  <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'delivery' | 'pickup')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                        <Label
                          htmlFor="delivery"
                          className="flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                            hover:bg-secondary transition-colors"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Entrega em domicílio</p>
                            <p className="text-sm text-muted-foreground">
                              Taxa: {selectedNeighborhood ? formatPrice(selectedNeighborhood.deliveryFee) : 'Selecione o bairro'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {settings.deliveryTimeMin}-{settings.deliveryTimeMax} min
                            </p>
                          </div>
                        </Label>
                      </div>

                      <div className="relative">
                        <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                        <Label
                          htmlFor="pickup"
                          className="flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                            hover:bg-secondary transition-colors"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Store className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Retirada na loja</p>
                            <p className="text-sm text-muted-foreground">Sem taxa</p>
                            <p className="text-xs text-muted-foreground">
                              {settings.pickupTimeMin}-{settings.pickupTimeMax} min
                            </p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  <div>
                    <Label htmlFor="observations">Observações do pedido</Label>
                    <Textarea
                      id="observations"
                      placeholder="Ex: Sem cebola, molho extra, etc."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Address (ONLY if delivery type is 'delivery') */}
              {step === 'address' && deliveryType === 'delivery' && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Endereço de Entrega
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Select 
                          value={selectedNeighborhood?.id || ''} 
                          onValueChange={(id) => {
                            const nb = activeNeighborhoods.find(n => n.id === id);
                            setSelectedNeighborhood(nb || null);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeNeighborhoods.map(nb => (
                              <SelectItem key={nb.id} value={nb.id}>
                                {nb.name} - {formatPrice(nb.deliveryFee)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="street">Rua *</Label>
                      <Input
                        id="street"
                        placeholder="Nome da rua"
                        value={address.street}
                        onChange={(e) => setAddress({ street: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          placeholder="123"
                          value={address.number}
                          onChange={(e) => setAddress({ number: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          placeholder="Apto, Bloco..."
                          value={address.complement}
                          onChange={(e) => setAddress({ complement: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reference">Referência</Label>
                      <Input
                        id="reference"
                        placeholder="Próximo ao..."
                        value={address.reference}
                        onChange={(e) => setAddress({ reference: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    {/* Save as default option if customer is logged in */}
                    {currentCustomer && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        saveAsDefault 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-secondary/50 border-secondary'
                      }`}>
                        <Checkbox
                          id="save-as-default"
                          checked={saveAsDefault}
                          onCheckedChange={(checked) => setSaveAsDefault(checked as boolean)}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor="save-as-default" 
                            className="text-sm font-medium cursor-pointer"
                          >
                            Usar como endereço padrão
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {currentCustomer.street 
                              ? 'Será salvo como preferido para próximos pedidos' 
                              : 'Marque para usar automaticamente nos próximos pedidos'}
                          </p>
                        </div>
                        {currentCustomer.street && (
                          <Home className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Payment */}
              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Forma de Pagamento
                  </h3>

                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'pix' | 'card' | 'cash')}>
                    <div className="grid grid-cols-1 gap-4">
                      {/* PIX */}
                      <div className="relative">
                        <RadioGroupItem value="pix" id="pix" className="peer sr-only" />
                        <Label
                          htmlFor="pix"
                          className="flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                            hover:bg-secondary transition-colors"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">PIX</p>
                            <p className="text-sm text-muted-foreground">Pagamento instantâneo via QR Code</p>
                          </div>
                        </Label>
                      </div>

                      {/* CPF para PIX - APENAS aqui e APENAS para PIX */}
                      {paymentMethod === 'pix' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-secondary/50 rounded-xl p-4 space-y-2"
                        >
                          <Label htmlFor="cpf-pix">CPF *</Label>
                          <Input
                            id="cpf-pix"
                            placeholder="000.000.000-00"
                            value={customer.cpf}
                            onChange={(e) => handleCpfInput(e.target.value)}
                            maxLength={14}
                          />
                          <p className="text-xs text-muted-foreground">Necessário para segurança do pagamento PIX</p>
                        </motion.div>
                      )}

                      {/* Cartão */}
                      <div className="relative">
                        <RadioGroupItem value="card" id="card" className="peer sr-only" />
                        <Label
                          htmlFor="card"
                          className="flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                            hover:bg-secondary transition-colors"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Cartão</p>
                            <p className="text-sm text-muted-foreground">Crédito ou débito na entrega</p>
                          </div>
                        </Label>
                      </div>

                      {/* Dinheiro */}
                      <div className="relative">
                        <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                        <Label
                          htmlFor="cash"
                          className="flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                            hover:bg-secondary transition-colors"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Banknote className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Dinheiro</p>
                            <p className="text-sm text-muted-foreground">Pagamento em espécie na entrega</p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  {/* Opção de troco para dinheiro */}
                  {paymentMethod === 'cash' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-secondary/50 rounded-xl p-4 space-y-4"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="needsChange" 
                          checked={needsChange}
                          onCheckedChange={(checked) => setNeedsChange(checked as boolean)}
                        />
                        <Label htmlFor="needsChange" className="cursor-pointer">
                          Preciso de troco
                        </Label>
                      </div>

                      {needsChange && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Label htmlFor="changeAmount">Troco para quanto?</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                            <Input
                              id="changeAmount"
                              type="number"
                              placeholder="0,00"
                              value={changeAmount}
                              onChange={(e) => setChangeAmount(e.target.value)}
                              className="pl-10"
                              min={total}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total do pedido: {formatPrice(total)}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  <Separator className="my-6" />

                  {/* Loyalty Points Redemption - Only for logged in customers */}
                  {isRemembered && currentCustomer && currentCustomer.totalPoints > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-amber-900">Resgate de Pontos</h4>
                        <Star className="w-4 h-4 text-amber-500 ml-auto" />
                      </div>

                      <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-100">
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo disponível</p>
                          <p className="text-2xl font-bold text-amber-600">{currentCustomer.totalPoints} pts</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Equivale a</p>
                          <p className="text-lg font-semibold text-primary">
                            {formatPrice((currentCustomer.totalPoints / 100) * 5)}
                          </p>
                        </div>
                      </div>

                      {currentCustomer.totalPoints > 0 && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="points-slider" className="text-sm font-medium">
                                Quanto deseja gastar?
                              </Label>
                              <span className={`text-sm font-semibold ${pointsToRedeem > 0 && pointsToRedeem < (useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50) ? 'text-red-500' : 'text-primary'}`}>
                                {pointsToRedeem} pts
                              </span>
                            </div>
                            <input
                              id="points-slider"
                              type="range"
                              min="0"
                              max={currentCustomer.totalPoints}
                              value={pointsToRedeem}
                              onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
                              className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(pointsToRedeem / currentCustomer.totalPoints) * 100}%, #fef3c7 ${(pointsToRedeem / currentCustomer.totalPoints) * 100}%, #fef3c7 100%)`
                              }}
                            />
                            {pointsToRedeem > 0 && pointsToRedeem < (useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50) && (
                              <p className="text-xs text-red-500 font-medium">
                                ⚠️ Mínimo de {useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50} pontos para resgate
                              </p>
                            )}
                          </div>

                          {pointsToRedeem > 0 && pointsToRedeem >= (useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50) && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="bg-white rounded-lg p-3 border border-green-200 flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs text-muted-foreground">Desconto</p>
                                <p className="text-lg font-bold text-green-600">
                                  -{formatPrice(calculatePointsDiscount())}
                                </p>
                              </div>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </motion.div>
                          )}

                          <p className="text-xs text-center text-muted-foreground">
                            100 pontos = R$ {useLoyaltySettingsStore.getState().settings?.discountPer100Points ?? 5} de desconto
                            {currentCustomer.totalPoints > 0 && (
                              <>
                                <br />
                                <span className="text-amber-600 font-medium">Mínimo: {useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50} pontos</span>
                              </>
                            )}
                          </p>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Coupon Section */}
                  {isRemembered && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-4 space-y-3 border border-purple-200 dark:border-purple-800"
                    >
                      <h4 className="font-semibold flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-600" />
                        Usar Cupom de Promoção
                      </h4>

                      {!appliedCoupon ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Digite o código do cupom"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value.toUpperCase());
                                setCouponValidationMessage('');
                              }}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleApplyCoupon}
                              variant="outline"
                              size="sm"
                            >
                              Aplicar
                            </Button>
                          </div>
                          {couponValidationMessage && (
                            <p className={`text-xs ${couponValidationMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                              {couponValidationMessage}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 flex items-center justify-between border-2 border-green-200">
                          <div>
                            <p className="text-xs text-muted-foreground">Cupom Aplicado</p>
                            <p className="font-mono font-bold text-green-600">{appliedCoupon}</p>
                            <p className="text-xs text-green-600">-{couponDiscount}% de desconto</p>
                          </div>
                          <button
                            onClick={handleRemoveCoupon}
                            className="p-2 hover:bg-red-50 rounded transition"
                            title="Remover cupom"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  <Separator className="my-6" />

                  {/* Order Summary */}
                  <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold">Resumo do Pedido</h4>
                    
                    <div className="space-y-2 text-sm">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.product.name}
                            {item.size && ` (${item.size})`}
                          </span>
                          <span>{formatPrice(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span>{deliveryType === 'pickup' ? 'Grátis' : formatPrice(deliveryFee)}</span>
                    </div>

                    {pointsToRedeem > 0 && pointsToRedeem >= (useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50) && (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Desconto (pontos)</span>
                        <span>-{formatPrice(calculatePointsDiscount())}</span>
                      </div>
                    )}

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between text-sm text-purple-600 font-medium">
                        <span>Desconto (cupom {appliedCoupon})</span>
                        <span>-{formatPrice((total * couponDiscount) / 100)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatPrice(total - (pointsToRedeem > 0 && pointsToRedeem >= (useLoyaltySettingsStore.getState().settings?.minPointsToRedeem ?? 50) ? calculatePointsDiscount() : 0) - (appliedCoupon && couponDiscount > 0 ? (total * couponDiscount) / 100 : 0))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PIX Payment Step */}
              {step === 'pix' && pixData && (
                <motion.div
                  key="pix"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Escaneie o QR Code para pagar</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total: <span className="font-semibold text-primary">{formatPrice(total)}</span>
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center">
                    {pixData.qrCodeBase64 ? (
                      <img 
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-64 h-64 rounded-lg border"
                      />
                    ) : (
                      <div className="w-64 h-64 bg-secondary rounded-lg flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Código PIX para copiar */}
                  <div className="space-y-2">
                    <Label>Ou copie o código PIX:</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={pixData.qrCode || ''} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={copyPixCode}
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

                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Após realizar o pagamento, clique no botão abaixo para confirmar seu pedido.
                    </p>
                  </div>

                  <Button 
                    className="w-full btn-cta"
                    onClick={handlePixConfirmed}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Já fiz o pagamento
                  </Button>
                </motion.div>
              )}

              {/* Confirmation */}
              {step === 'confirmation' && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                  
                  <h3 className="font-display text-2xl font-bold mb-2">
                    Pedido Confirmado!
                  </h3>
                  
                  <p className="text-muted-foreground mb-6">
                    Seu pedido foi recebido com sucesso.
                    <br />
                    Você receberá atualizações pelo WhatsApp.
                  </p>

                  <div className="bg-secondary/50 rounded-xl p-4 text-left max-w-sm mx-auto mb-6">
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Cliente:</span> {customer.name}</p>
                      <p><span className="text-muted-foreground">Telefone:</span> {customer.phone}</p>
                      <p><span className="text-muted-foreground">Entrega:</span> {deliveryType === 'delivery' ? 'Em domicílio' : 'Retirada'}</p>
                      <p><span className="text-muted-foreground">Pagamento:</span> {getPaymentMethodLabel()}</p>
                      {lastPointsDiscount > 0 && (
                        <p className="text-green-600 font-medium">Desconto (Pontos): -{formatPrice(lastPointsDiscount)}</p>
                      )}
                      {lastAppliedCoupon && lastCouponDiscount > 0 && (
                        <p className="text-purple-600 font-medium">Desconto (Cupom {lastAppliedCoupon}): -{formatPrice(lastCouponDiscount)}</p>
                      )}
                      <p className="font-semibold text-primary">Total: {lastFinalTotal > 0 ? formatPrice(lastFinalTotal) : formatPrice(total)}</p>
                    </div>
                  </div>

                  <Button onClick={handleClose} className="btn-cta">
                    Fazer novo pedido
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {!['confirmation', 'pix'].includes(step) && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={step === 'contact' ? handleBackToCart : prevStep}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {step === 'contact' ? 'Voltar ao carrinho' : 'Voltar'}
                </Button>

                {step === 'payment' ? (
                  <Button 
                    className="btn-cta gap-2"
                    onClick={handleSubmitOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : paymentMethod === 'pix' ? (
                      <>
                        Gerar PIX
                        <QrCode className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Confirmar Pedido
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button className="btn-cta gap-2" onClick={nextStep}>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    {/* Loyalty Registration Modal - Show only for non-registered, non-logged customers */}
    {!isRemembered && !currentCustomer?.isRegistered && (
      <PostCheckoutLoyaltyModal 
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
        email={lastOrderEmail || ''}
        pointsEarned={lastPointsEarned}
      />
    )}
    </>
  );
}
