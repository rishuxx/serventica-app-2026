import { savedServicesRepository, ISavedServicesRepository } from '../repositories/saved-services.repository';
import { SavedServiceItem } from '../../../../packages/types/src';

export class SavedServicesService {
  constructor(private readonly repository: ISavedServicesRepository = savedServicesRepository) {}

  /**
   * Fetch all saved services for user
   */
  async getSavedServices(userId: string): Promise<SavedServiceItem[]> {
    if (!userId) return [];
    return this.repository.getSavedServices(userId);
  }

  /**
   * Save service with validation
   */
  async saveService(userId: string, serviceId: string): Promise<boolean> {
    if (!userId || !serviceId) return false;
    return this.repository.saveService(userId, serviceId);
  }

  /**
   * Unsave service
   */
  async unsaveService(userId: string, serviceId: string): Promise<boolean> {
    if (!userId || !serviceId) return false;
    return this.repository.unsaveService(userId, serviceId);
  }

  /**
   * Toggle saved state
   */
  async toggleSavedService(userId: string, serviceId: string, currentSavedState: boolean): Promise<boolean> {
    if (!userId || !serviceId) return false;

    if (currentSavedState) {
      return this.repository.unsaveService(userId, serviceId);
    } else {
      return this.repository.saveService(userId, serviceId);
    }
  }

  /**
   * Check if service is saved
   */
  async isServiceSaved(userId: string, serviceId: string): Promise<boolean> {
    if (!userId || !serviceId) return false;
    return this.repository.isServiceSaved(userId, serviceId);
  }
}

export const savedServicesService = new SavedServicesService();
