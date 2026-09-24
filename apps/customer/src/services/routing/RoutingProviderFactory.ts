import { RoutingProvider } from './RoutingProvider';
import { OSRMRoutingProvider } from './OSRMRoutingProvider';
import { GoogleRoutingProvider } from './GoogleRoutingProvider';
import { MapboxRoutingProvider } from './MapboxRoutingProvider';
import { RoutingProviderName } from '../../types/routing.types';

/**
 * SERVENTICA — Routing Provider Factory (Strategy Pattern)
 * Allows runtime and configuration-driven switching of routing engines (Mapbox -> Google -> OSRM)
 * without modifying any business logic or UI code.
 */
export class RoutingProviderFactory {
  private static instance: RoutingProviderFactory;
  private readonly providers: Map<RoutingProviderName, RoutingProvider> = new Map();
  private defaultProviderName: RoutingProviderName = 'MAPBOX';

  private constructor() {
    // Register Mapbox as primary (Phase 2), with Google & OSRM as decoupled fallbacks
    this.providers.set('MAPBOX', new MapboxRoutingProvider());
    this.providers.set('GOOGLE', new GoogleRoutingProvider());
    this.providers.set('OSRM', new OSRMRoutingProvider());
  }

  public static getInstance(): RoutingProviderFactory {
    if (!RoutingProviderFactory.instance) {
      RoutingProviderFactory.instance = new RoutingProviderFactory();
    }
    return RoutingProviderFactory.instance;
  }

  public registerProvider(name: RoutingProviderName, provider: RoutingProvider): void {
    this.providers.set(name, provider);
  }

  public setDefaultProvider(name: RoutingProviderName): void {
    if (!this.providers.has(name)) {
      throw new Error(`Routing provider "${name}" is not registered.`);
    }
    this.defaultProviderName = name;
  }

  public getProvider(name?: RoutingProviderName): RoutingProvider {
    const targetName = name || this.defaultProviderName;
    const provider = this.providers.get(targetName);
    if (!provider) {
      // Fallback to Google / OSRM if requested provider is missing
      return this.providers.get('GOOGLE') || this.providers.get('OSRM') || new GoogleRoutingProvider();
    }
    return provider;
  }

  public getRegisteredProviders(): RoutingProviderName[] {
    return Array.from(this.providers.keys());
  }
}

export const routingFactory = RoutingProviderFactory.getInstance();
