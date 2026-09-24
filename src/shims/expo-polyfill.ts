import { Platform as RNPlatform } from 'react-native';

// Polyfill process.env.EXPO_OS if missing
if (typeof process !== 'undefined') {
  if (!process.env) {
    (process as any).env = {};
  }
  if (!process.env.EXPO_OS) {
    process.env.EXPO_OS = RNPlatform.OS || 'ios';
  }
}

// Universal Cross-Platform Expo Runtime Polyfill
// Ensures `globalThis.expo` (with EventEmitter, NativeModule, etc.) is always initialized,
// preventing `Cannot read property 'EventEmitter' of undefined` and `Super expression must either be null or a function`
// when Expo modules (like expo/src/winter/fetch) execute in bare React Native or Expo environments.

class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  addListener(eventName: string, listener: Function) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener);
    return {
      remove: () => {
        this.removeListener(eventName, listener);
      },
    };
  }

  removeListener(eventName: string, listener: Function) {
    this.listeners.get(eventName)?.delete(listener);
  }

  removeAllListeners(eventName?: string) {
    if (eventName) {
      this.listeners.get(eventName)?.clear();
    } else {
      this.listeners.clear();
    }
  }

  emit(eventName: string, ...args: any[]) {
    const list = this.listeners.get(eventName);
    if (list) {
      list.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  listenerCount(eventName: string) {
    return this.listeners.get(eventName)?.size ?? 0;
  }
}

class NativeModule extends EventEmitter {
  [key: string]: any;
}

class SharedObject extends EventEmitter {
  release() {}
}

class SharedRef extends SharedObject {
  nativeRefType = 'unknown';
}

class NativeRequest extends SharedObject {
  async start(): Promise<any> {
    return new NativeResponse();
  }
  cancel(): void {}
}

class NativeResponse extends SharedObject {
  get bodyUsed(): boolean {
    return false;
  }
  get _rawHeaders(): [string, string][] {
    return [];
  }
  get status(): number {
    return 200;
  }
  get statusText(): string {
    return 'OK';
  }
  get url(): string {
    return '';
  }
  get redirected(): boolean {
    return false;
  }
  async startStreaming(): Promise<Uint8Array | null> {
    return null;
  }
  cancelStreaming(): void {}
  async arrayBuffer(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }
  async text(): Promise<string> {
    return '';
  }
}

class FallbackNativeClass extends EventEmitter {
  [key: string]: any;
}

const expoFontLoaderStub = {
  getLoadedFonts: () => [],
  loadAsync: async () => {},
  unloadAllAsync: async () => {},
  unloadAsync: async () => {},
  isLoaded: () => true,
  getServerResources: () => [],
  getServerResourceDescriptors: () => [],
};

const createModuleProxy = () => {
  const cache: Record<string, any> = {
    ExpoFontLoader: expoFontLoaderStub,
  };
  return new Proxy(cache, {
    get: (target, moduleName: string) => {
      if (typeof moduleName !== 'string') return undefined;
      if (!target[moduleName]) {
        const moduleObj = {
          NativeRequest,
          NativeResponse,
          addListener: () => ({ remove: () => {} }),
          removeListeners: () => {},
          requestForegroundPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true }),
          requestPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true }),
          getForegroundPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true }),
          getCurrentPositionAsync: async () => null,
          getLastKnownPositionAsync: async () => null,
          geocodeAsync: async () => [],
          reverseGeocodeAsync: async () => [],
          enableNetworkProviderAsync: async () => {},
          hasServicesEnabledAsync: async () => true,
          startLocationUpdatesAsync: async () => {},
          stopLocationUpdatesAsync: async () => {},
          loadAsync: async () => {},
          getLoadedFonts: () => [],
          isLoaded: () => true,
          unloadAllAsync: async () => {},
          unloadAsync: async () => {},
          getServerResources: () => [],
          getServerResourceDescriptors: () => [],
          exportedMethods: {},
          modulesConstants: {},
        } as Record<string, any>;

        target[moduleName] = new Proxy(moduleObj, {
          get: (modTarget, propName: string) => {
            if (typeof propName !== 'string') return undefined;
            if (propName in modTarget) return modTarget[propName];
            if (propName === 'exportedMethods' || propName === 'modulesConstants') return {};
            if (propName === 'NativeResponse') return NativeResponse;
            if (propName === 'NativeRequest') return NativeRequest;
            // If property starts with uppercase, return a class constructor that can be extended
            if (propName[0] >= 'A' && propName[0] <= 'Z') {
              return FallbackNativeClass;
            }
            return undefined;
          },
        });
      }
      return target[moduleName];
    },
  });
};

const setupExpoGlobal = () => {
  const existingExpo = (globalThis as any).expo;

  if (existingExpo && existingExpo.modules && typeof existingExpo.modules === 'object') {
    if (!existingExpo.EventEmitter) existingExpo.EventEmitter = EventEmitter;
    if (!existingExpo.NativeModule) existingExpo.NativeModule = NativeModule;
    if (!existingExpo.SharedObject) existingExpo.SharedObject = SharedObject;
    if (!existingExpo.SharedRef) existingExpo.SharedRef = SharedRef;
    if (!existingExpo.modules.ExpoFontLoader) {
      existingExpo.modules.ExpoFontLoader = expoFontLoaderStub;
    }
    return;
  }

  if (!existingExpo) {
    (globalThis as any).expo = {
      EventEmitter,
      NativeModule,
      SharedObject,
      SharedRef,
      modules: createModuleProxy(),
      uuidv4: () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }),
      uuidv5: () => '00000000-0000-0000-0000-000000000000',
      getViewConfig: () => ({}),
      reloadAppAsync: async () => {},
      expoModulesCoreVersion: '57.0.18',
    };
  } else {
    if (!existingExpo.EventEmitter) existingExpo.EventEmitter = EventEmitter;
    if (!existingExpo.NativeModule) existingExpo.NativeModule = NativeModule;
    if (!existingExpo.SharedObject) existingExpo.SharedObject = SharedObject;
    if (!existingExpo.SharedRef) existingExpo.SharedRef = SharedRef;
    if (!existingExpo.modules) {
      existingExpo.modules = createModuleProxy();
    } else if (!existingExpo.modules.ExpoFontLoader) {
      existingExpo.modules.ExpoFontLoader = expoFontLoaderStub;
    }
  }
  
  // Ensure React Native native fetch is used rather than expo/src/winter/fetch mock
  (process.env as any).EXPO_PUBLIC_USE_RN_FETCH = 'true';
};

setupExpoGlobal();

export {
  EventEmitter,
  NativeModule,
  SharedObject,
  SharedRef,
  NativeRequest,
  NativeResponse,
  FallbackNativeClass,
};
