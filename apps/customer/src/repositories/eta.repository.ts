import { etaService, ETAService } from '../services/routing/ETAService';
import { ETAResult, GeoPoint } from '../types/routing.types';

export class ETARepository {
  constructor(private readonly service: ETAService = etaService) {}

  async getETAForLocation(destination: GeoPoint): Promise<ETAResult> {
    return this.service.calculateETA(destination, 'DRIVING', 'CUSTOMER_HOME_ETA');
  }
}

export const etaRepository = new ETARepository();
