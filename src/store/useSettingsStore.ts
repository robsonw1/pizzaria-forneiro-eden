import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

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
  isManuallyOpen: boolean;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  pickupTimeMin: number;
  pickupTimeMax: number;
  adminPassword: string;
}

interface SettingsStore {
  settings: StoreSettings;
  isLoading: boolean;
  isSynced: boolean;
  updateSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  updateDaySchedule: (day: keyof WeekSchedule, schedule: Partial<DaySchedule>) => Promise<void>;
  toggleManualOpen: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
  syncFromSupabase: () => Promise<void>;
  isStoreOpen: () => boolean;
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

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      isSynced: false,

      updateSettings: async (newSettings) => {
        // Update local state
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('settings'))
            .upsert({
              id: 'store-settings',
              key: 'store',
              value: { ...get().settings },
            });
        } catch (err) {
          console.error('Error saving settings:', err);
        }
      },

      updateDaySchedule: async (day, schedule) => {
        // Update local state
        set((state) => ({
          settings: {
            ...state.settings,
            schedule: {
              ...state.settings.schedule,
              [day]: { ...state.settings.schedule[day], ...schedule },
            },
          },
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('settings'))
            .upsert({
              id: 'store-settings',
              key: 'store',
              value: { ...get().settings },
            });
        } catch (err) {
          console.error('Error saving schedule:', err);
        }
      },

      toggleManualOpen: async () => {
        // Update local state
        set((state) => ({
          settings: { ...state.settings, isManuallyOpen: !state.settings.isManuallyOpen },
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('settings'))
            .upsert({
              id: 'store-settings',
              key: 'store',
              value: { ...get().settings },
            });
        } catch (err) {
          console.error('Error toggling manual open:', err);
        }
      },

      changePassword: (currentPassword, newPassword) => {
        const { settings } = get();
        if (currentPassword !== settings.adminPassword) {
          return { success: false, message: 'Senha atual incorreta' };
        }
        if (newPassword.length < 6) {
          return { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres' };
        }
        
        // Update locally and sync
        set((state) => ({
          settings: { ...state.settings, adminPassword: newPassword },
        }));

        // Sync to Supabase (fire and forget)
        try {
          ((supabase as any)
            .from('settings'))
            .upsert({
              id: 'store-settings',
              key: 'store',
              value: { ...get().settings },
            });
        } catch (err) {
          console.error('Error saving password:', err);
        }

        return { success: true, message: 'Senha alterada com sucesso!' };
      },

      syncFromSupabase: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await ((supabase as any)
            .from('settings'))
            .select('value')
            .eq('key', 'store')
            .single();

          if (error) {
            console.error('Failed to sync settings:', error);
            set({ isLoading: false });
            return;
          }

          if (data && data.value) {
            set({
              settings: data.value as StoreSettings,
              isSynced: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.error('Error syncing from Supabase:', err);
          set({ isLoading: false });
        }
      },

      isStoreOpen: () => {
        const { settings } = get();

        if (!settings.isManuallyOpen) {
          return false;
        }

        const now = new Date();
        const currentDay = dayNames[now.getDay()];
        const daySchedule = settings.schedule[currentDay];

        if (!daySchedule.isOpen) {
          return false;
        }

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [openHour, openMinute] = daySchedule.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = daySchedule.closeTime.split(':').map(Number);

        const openTime = openHour * 60 + openMinute;
        let closeTime = closeHour * 60 + closeMinute;

        if (closeTime <= openTime) {
          closeTime += 24 * 60;
          const adjustedCurrentTime = currentTime < openTime ? currentTime + 24 * 60 : currentTime;
          return adjustedCurrentTime >= openTime && adjustedCurrentTime < closeTime;
        }

        return currentTime >= openTime && currentTime < closeTime;
      },
    }),
    {
      name: 'forneiro-eden-settings',
      version: 4,
    }
  )
);
