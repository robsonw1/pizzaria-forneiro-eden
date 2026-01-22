import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreSettings {
  name: string;
  phone: string;
  address: string;
  weekdaysOpen: string;
  weekdaysClose: string;
  saturdayOpen: string;
  saturdayClose: string;
  sundayOpen: string;
  sundayClose: string;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  pickupTimeMin: number;
  pickupTimeMax: number;
  adminPassword: string;
}

interface SettingsStore {
  settings: StoreSettings;
  updateSettings: (settings: Partial<StoreSettings>) => void;
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
}

const defaultSettings: StoreSettings = {
  name: 'Forneiro Éden',
  phone: '(11) 99999-9999',
  address: 'Rua das Pizzas, 123 - Centro',
  weekdaysOpen: '18:00',
  weekdaysClose: '23:00',
  saturdayOpen: '17:00',
  saturdayClose: '00:00',
  sundayOpen: '17:00',
  sundayClose: '23:00',
  deliveryTimeMin: 60,
  deliveryTimeMax: 70,
  pickupTimeMin: 40,
  pickupTimeMax: 50,
  adminPassword: 'admin123',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
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
    }),
    {
      name: 'forneiro-eden-settings',
      version: 1,
    }
  )
);
