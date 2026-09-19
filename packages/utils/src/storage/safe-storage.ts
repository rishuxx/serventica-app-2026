// In-memory fallback for AsyncStorage when native module is not linked or running in pure JS/web/dev
const memoryStore = new Map<string, string>();

export const SafeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const native = require('@react-native-async-storage/async-storage').default;
      if (native && typeof native.getItem === 'function') {
        return await native.getItem(key);
      }
    } catch {
      // Native module not linked, fall back
    }
    return memoryStore.get(key) ?? null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const native = require('@react-native-async-storage/async-storage').default;
      if (native && typeof native.setItem === 'function') {
        return await native.setItem(key, value);
      }
    } catch {
      // Native module not linked, fall back
    }
    memoryStore.set(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const native = require('@react-native-async-storage/async-storage').default;
      if (native && typeof native.removeItem === 'function') {
        return await native.removeItem(key);
      }
    } catch {
      // Native module not linked, fall back
    }
    memoryStore.delete(key);
  },

  clear: async (): Promise<void> => {
    try {
      const native = require('@react-native-async-storage/async-storage').default;
      if (native && typeof native.clear === 'function') {
        return await native.clear();
      }
    } catch {
      // Native module not linked, fall back
    }
    memoryStore.clear();
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      const native = require('@react-native-async-storage/async-storage').default;
      if (native && typeof native.getAllKeys === 'function') {
        return await native.getAllKeys();
      }
    } catch {
      // Native module not linked, fall back
    }
    return Array.from(memoryStore.keys());
  },
};

export default SafeAsyncStorage;
