import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para imprimir pedidos via Edge Function do Supabase
 */
export const usePrintOrder = () => {
  const printOrder = async (
    orderId: string,
    tenantId?: string,
    force?: boolean
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('printorder', {
        body: {
          orderId,
          tenantId,
          force,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to print order');
      }

      return {
        success: true,
        message: data.message,
        printJobId: data.printJobId,
      };
    } catch (error) {
      console.error('Error printing order:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return { printOrder };
};
