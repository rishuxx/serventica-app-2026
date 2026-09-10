import { RoutingProvider } from './RoutingProvider';
import { OSRMRoutingProvider } from './OSRMRoutingProvider';
import { RoutingProviderName } from '../../types/routing.types';

/**
 * SERVENTICA — Routing Provider Factory (Strategy Pattern)
 * Allows runtime and configuration-driven switching of routing engines (OSRM -> Mapbox -> Google)
 * without modifying any business logic or UI code.
 */
export class RoutingProviderFactory {
  private static instance: RoutingProviderFactory;
  private readonly providers: Map<RoutingProviderName, RoutingProvider> = new Map();
  private defaultProviderName: RoutingProviderName = 'OSRM';

  private constructor() {
    // Register default OSRM Provider
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
      // Fallback to OSRM if requested provider is missing
      return this.providers.get('OSRM') || new OSRMRoutingProvider();
    }
    return provider;
  }
}
