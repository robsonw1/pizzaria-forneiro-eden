import { useState } from 'react';
import {
  Dialog,
  DialogContent,
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
import { supabase } from '@/integrations/supabase/client';
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
  AlertCircle
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
    setCustomer,
    setAddress,
    setDeliveryType,
    setPaymentMethod,
    setObservations,
    setSelectedNeighborhood,
    setNeedsChange,
    setChangeAmount,
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;

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
        if (!customer.cpf || customer.cpf.replace(/\D/g, '').length !== 11) {
          toast.error('Por favor, informe um CPF válido');
          return false;
        }
        return true;
      case 'address':
        if (deliveryType === 'pickup') return true;
        if (!address.zipCode || !address.street || !address.number || !selectedNeighborhood) {
          toast.error('Por favor, preencha o endereço completo');
          return false;
        }
        return true;
      case 'delivery':
        return true;
      case 'payment':
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
    const steps: Step[] = ['contact', 'address', 'delivery', 'payment'];
    const currentIndex = steps.indexOf(step as any);
    
    if (!validateStep(step)) return;
    
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['contact', 'address', 'delivery', 'payment'];
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

  const handleZipCodeInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
    setAddress({ zipCode: formatted });
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

    // Build detailed items array with combo half-half info
    const formattedItems = items.map(item => {
      const isCombo = item.product.category === 'combos';
      const isPizza = ['promocionais', 'tradicionais', 'premium', 'especiais', 'doces'].includes(item.product.category);
      
      // Build combo pizzas array with half-half details
      const comboPizzas = item.comboPizzaFlavors?.map((pizza: any, index: number) => {
        if (pizza.isHalfHalf && pizza.secondHalf) {
          return {
            pizzaNumber: index + 1,
            type: 'meia-meia',
            sabor1: pizza.name,
            sabor2: pizza.secondHalf.name,
            description: `Pizza ${index + 1}: Meia ${pizza.name} + Meia ${pizza.secondHalf.name}`,
          };
        }
        return {
          pizzaNumber: index + 1,
          type: 'inteira',
          sabor: pizza.name,
          description: `Pizza ${index + 1}: ${pizza.name}`,
        };
      }) || [];

      // Build pizza half-half info for regular pizzas
      let pizzaInfo: any = {};
      if (isPizza) {
        if (item.isHalfHalf && item.secondHalf) {
          pizzaInfo = {
            type: 'meia-meia',
            size: item.size === 'grande' ? 'Grande' : 'Broto',
            sabor1: item.product.name,
            sabor2: item.secondHalf.name,
          };
        } else {
          pizzaInfo = {
            type: 'inteira',
            size: item.size === 'grande' ? 'Grande' : 'Broto',
            sabor: item.product.name,
          };
        }
      }

      return {
        id: item.id,
        productId: item.product.id,
        name: item.product.name,
        category: item.product.category,
        quantity: item.quantity,
        unitPrice: item.totalPrice / item.quantity,
        totalPrice: item.totalPrice,
        // Pizza specific
        ...(isPizza && {
          pizza: {
            ...pizzaInfo,
            borda: item.border?.name || 'Sem borda',
            adicionais: item.extras?.map(e => e.name) || [],
          },
        }),
        // Combo specific
        ...(isCombo && {
          combo: {
            pizzas: comboPizzas,
            borda: item.border?.name || 'Sem borda',
          },
        }),
        // Drink
        bebida: item.drink?.name || 'Sem bebida',
        bebidaGratis: item.isDrinkFree || false,
        // Custom ingredients (Moda do Cliente)
        ...(item.customIngredients && {
          ingredientesPersonalizados: item.customIngredients,
        }),
        // Observations
        observacoes: '',
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
        email: customer.email || '',
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
      },
      
      // Observations
      observations: observations || '',
    };
  };

  const sendOrderToWebhook = async (orderPayload: any) => {
    console.log('Enviando pedido para webhook:', orderPayload);
    
    // Add order to local store for admin panel
    addOrder({
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      address: {
        zipCode: address.zipCode,
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
      total,
      status: 'pending',
      observations,
    });
    
    await fetch('https://n8nwebhook.aezap.site/webhook/impressao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors',
      body: JSON.stringify(orderPayload),
    });
  };

  const handleSubmitOrder = async () => {
    if (!storeOpen) {
      toast.error('Estabelecimento fechado. Não é possível fazer pedidos no momento.');
      return;
    }
    if (!validateStep('payment')) return;
    
    setIsProcessing(true);
    const orderId = `PED-${Date.now().toString().slice(-5)}`;
    const orderPayload = buildOrderPayload(orderId);

    try {
      if (paymentMethod === 'pix') {
        // Create PIX payment and show QR code
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago-payment', {
          body: {
            orderId,
            amount: total,
            description: `Pedido ${orderId} - Forneiro Éden`,
            payerEmail: customer.email || 'cliente@forneiroeden.com',
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
          
          // Send order to webhook
          await sendOrderToWebhook(orderPayload);
          
          setStep('pix');
        } else {
          throw new Error('QR Code não gerado');
        }
      } else {
        // For card and cash, just send order directly
        await sendOrderToWebhook(orderPayload);
        
        toast.success('Pedido enviado com sucesso!');
        setStep('confirmation');
      }

    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      toast.error('Erro ao processar pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePixConfirmed = () => {
    toast.success('Pedido confirmado! Aguardando confirmação do pagamento.');
    setStep('confirmation');
  };

  const handleClose = () => {
    if (step === 'confirmation') {
      clearCart();
      reset();
    }
    setStep('contact');
    setPixData(null);
    setCopied(false);
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
    <Dialog open={isCheckoutOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
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
                {['contact', 'address', 'delivery', 'payment'].map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${step === s || ['contact', 'address', 'delivery', 'payment'].indexOf(step as any) > i
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                        }`}
                    >
                      {i + 1}
                    </div>
                    {i < 3 && (
                      <div className={`w-8 md:w-16 h-1 mx-1 rounded
                        ${['contact', 'address', 'delivery', 'payment'].indexOf(step as any) > i
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

                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={customer.cpf}
                        onChange={(e) => handleCpfInput(e.target.value)}
                        className="mt-1"
                        maxLength={14}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email (opcional)</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={customer.email}
                          onChange={(e) => setCustomer({ email: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Address */}
              {step === 'address' && (
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="zipcode">CEP *</Label>
                        <Input
                          id="zipcode"
                          placeholder="00000-000"
                          value={address.zipCode}
                          onChange={(e) => handleZipCodeInput(e.target.value)}
                          className="mt-1"
                          maxLength={9}
                        />
                      </div>

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
                  </div>
                </motion.div>
              )}

              {/* Step 3: Delivery */}
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

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
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
                      <p className="font-semibold text-primary">Total: {formatPrice(total)}</p>
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
  );
}
