// Universal Cross-Platform Expo Runtime Polyfill
// Ensures `globalThis.expo` (with EventEmitter, NativeModule, etc.) is always initialized,
// preventing `Cannot read property 'EventEmitter' of undefined` on bare React Native Android / iOS.

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

class FallbackNativeClass extends EventEmitter {
  [key: string]: any;
}

const createModuleProxy = () => {
  const cache: Record<string, any> = {};
  return new Proxy(cache, {
    get: (target, moduleName: string) => {
      if (typeof moduleName !== 'string') return undefined;
      if (!target[moduleName]) {
        const moduleObj = new Proxy(
          {
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
          } as Record<string, any>,
          {
            get: (modTarget, propName: string) => {
              if (typeof propName !== 'string') return undefined;
              if (propName in modTarget) return modTarget[propName];
              // If property starts with uppercase, it is likely a class (like NativeResponse)
              if (propName[0] >= 'A' && propName[0] <= 'Z') {
                return FallbackNativeClass;
              }
              return undefined;
            },
          }
        );
        target[moduleName] = moduleObj;
      }
      return target[moduleName];
    },
  });
};

if (!(globalThis as any).expo) {
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
  // Ensure missing properties are polyfilled if globalThis.expo exists partially
  const exp = (globalThis as any).expo;
  if (!exp.EventEmitter) exp.EventEmitter = EventEmitter;
  if (!exp.NativeModule) exp.NativeModule = NativeModule;
  if (!exp.SharedObject) exp.SharedObject = SharedObject;
  if (!exp.SharedRef) exp.SharedRef = SharedRef;
  if (!exp.modules) exp.modules = createModuleProxy();
}

export {};
