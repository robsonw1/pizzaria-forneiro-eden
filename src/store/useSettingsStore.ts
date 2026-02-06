import { create } from 'zustand';
import { persist } from 'zustand/middleware';import { supabase } from '@/integrations/supabase/client';
export interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface StoreSettings {
  name: string;
  phone: string;
  address: string;
  slogan: string;
  schedule: WeekSchedule;
  isManuallyOpen: boolean; // Manual override for open/closed
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  pickupTimeMin: number;
  pickupTimeMax: number;
  adminPassword: string;
  printnode_printer_id?: string | null;
  print_mode?: string;
}

interface SettingsStore {
  settings: StoreSettings;
  updateSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  setSetting: (key: keyof StoreSettings, value: any) => void;
  updateDaySchedule: (day: keyof WeekSchedule, schedule: Partial<DaySchedule>) => void;
  toggleManualOpen: () => void;
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
  isStoreOpen: () => boolean;
  syncSettingsToSupabase: () => Promise<{ success: boolean; message: string }>;
}

const defaultDaySchedule: DaySchedule = {
  isOpen: true,
  openTime: '18:00',
  closeTime: '23:00',
};

const defaultWeekSchedule: WeekSchedule = {
  monday: { isOpen: false, openTime: '18:00', closeTime: '23:00' },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { isOpen: true, openTime: '17:00', closeTime: '00:00' },
  sunday: { isOpen: true, openTime: '17:00', closeTime: '23:00' },
};

const defaultSettings: StoreSettings = {
  name: 'Forneiro Éden',
  phone: '(11) 99999-9999',
  address: 'Rua das Pizzas, 123 - Centro',
  slogan: 'A Pizza mais recheada da cidade 🇮🇹',
  schedule: defaultWeekSchedule,
  isManuallyOpen: true,
  deliveryTimeMin: 60,
  deliveryTimeMax: 70,
  pickupTimeMin: 40,
  pickupTimeMax: 50,
  adminPassword: 'admin123',
};

const dayNames: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,

  updateSettings: async (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    
    // Salvar no Supabase
    try {
      const { settings: currentSettings } = get();
      const { error } = await supabase
        .from('settings')
        .update({
          store_name: currentSettings.name,
          store_phone: currentSettings.phone,
          store_address: currentSettings.address,
          printnode_printer_id: currentSettings.printnode_printer_id || null,
          print_mode: currentSettings.print_mode || 'auto',
        })
        .eq('id', 'store-settings');

      if (error) {
        console.error('❌ Erro ao salvar settings no Supabase:', error);
        throw error;
      }

      console.log('✅ Settings salvos no Supabase com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar settings:', error);
      throw error;
    }
  },

  setSetting: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    })),

  updateDaySchedule: (day, schedule) =>
    set((state) => ({
      settings: {
        ...state.settings,
        schedule: {
          ...state.settings.schedule,
          [day]: { ...state.settings.schedule[day], ...schedule },
        },
      },
    })),

  toggleManualOpen: () =>
    set((state) => ({
      settings: { ...state.settings, isManuallyOpen: !state.settings.isManuallyOpen },
    })),

  changePassword: (currentPassword, newPassword) => {
    const { settings } = get();
    if (currentPassword !== settings.adminPassword) {
      return { success: false, message: 'Senha atual incorreta' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres' };
    }
    set((state) => ({
      settings: { ...state.settings, adminPassword: newPassword },
    }));
    return { success: true, message: 'Senha alterada com sucesso!' };
  },

  isStoreOpen: () => {
    const { settings } = get();
    
    // If manually closed, store is closed
    if (!settings.isManuallyOpen) {
      return false;
    }

    const now = new Date();
    const currentDay = dayNames[now.getDay()];
    const daySchedule = settings.schedule[currentDay];

    // If day is marked as closed
    if (!daySchedule.isOpen) {
      return false;
    }

    // Check current time against schedule
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [openHour, openMinute] = daySchedule.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = daySchedule.closeTime.split(':').map(Number);
    
    const openTime = openHour * 60 + openMinute;
    let closeTime = closeHour * 60 + closeMinute;
    
    // Handle closing time past midnight (e.g., 00:00 means midnight)
    if (closeTime <= openTime) {
      closeTime += 24 * 60; // Add 24 hours
      const adjustedCurrentTime = currentTime < openTime ? currentTime + 24 * 60 : currentTime;
      return adjustedCurrentTime >= openTime && adjustedCurrentTime < closeTime;
    }

    return currentTime >= openTime && currentTime < closeTime;
  },

  syncSettingsToSupabase: async () => {
    try {
      const { settings } = get();
      
      // Salvar na tabela settings do Supabase
      const { error } = await (supabase as any)
        .from('settings')
        .update({ value: settings })
        .eq('id', 'store-settings');

      if (error) {
        console.error('❌ Erro ao sincronizar settings com Supabase:', error);
        return { success: false, message: 'Erro ao sincronizar configurações' };
      }

      console.log('✅ Settings sincronizados com Supabase:', settings);
      return { success: true, message: 'Configurações sincronizadas com sucesso!' };
    } catch (error) {
      console.error('❌ Erro ao sincronizar settings:', error);
      return { success: false, message: 'Erro ao sincronizar configurações' };
    }
  },
}));
