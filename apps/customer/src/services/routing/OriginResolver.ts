import { ServiceOrigin, GeoPoint } from '../../types/routing.types';
import { serviceOriginRepository } from '../../repositories/origin.repository';

export interface OriginResolutionContext {
  destination: GeoPoint;
  serviceId?: string;
  categoryId?: string;
  purpose?: string;
}

export interface OriginResolver {
  resolveOrigin(context: OriginResolutionContext): Promise<ServiceOrigin>;
}

/**
 * Fixed / Configured Origin Resolver (SERV-02 Initial Implementation)
 * Resolves the primary active operational hub configured in the database.
 */
export class ConfiguredOriginResolver implements OriginResolver {
  async resolveOrigin(context: OriginResolutionContext): Promise<ServiceOrigin> {
    return serviceOriginRepository.getPrimaryActiveOrigin();
  }
}

export const defaultOriginResolver = new ConfiguredOriginResolver();
