
import { Preferences } from '@capacitor/preferences';
import { StateStorage } from 'zustand/middleware';

/**
 * Custom storage for Zustand using @capacitor/preferences.
 * This ensures data persistence even if the browser cache is cleared on Android.
 */
export const capacitorStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key: name });
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name: string): Promise<void> => {
    await Preferences.remove({ key: name });
  },
};
