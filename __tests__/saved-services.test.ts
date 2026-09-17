import { SavedServicesService } from '../apps/customer/src/services/saved-services.service';
import { ISavedServicesRepository } from '../apps/customer/src/repositories/saved-services.repository';
import { SavedServiceItem } from '../packages/types/src';

class MockSavedServicesRepository implements ISavedServicesRepository {
  private store = new Map<string, Set<string>>();

  async getSavedServices(userId: string): Promise<SavedServiceItem[]> {
    const userServices = this.store.get(userId) || new Set<string>();
    return Array.from(userServices).map((serviceId) => ({
      id: `saved_${serviceId}`,
      userId,
      serviceId,
      createdAt: new Date().toISOString(),
      service: {
        id: serviceId,
        name: 'Mock Service',
        slug: 'mock-service',
        description: 'Mock Description',
        basePrice: 499,
        durationMinutes: 45,
        rating: 4.9,
        reviewsCount: 120,
      },
    }));
  }

  async saveService(userId: string, serviceId: string): Promise<boolean> {
    if (!this.store.has(userId)) {
      this.store.set(userId, new Set<string>());
    }
    this.store.get(userId)!.add(serviceId);
    return true;
  }

  async unsaveService(userId: string, serviceId: string): Promise<boolean> {
    if (this.store.has(userId)) {
      this.store.get(userId)!.delete(serviceId);
    }
    return true;
  }

  async isServiceSaved(userId: string, serviceId: string): Promise<boolean> {
    return Boolean(this.store.get(userId)?.has(serviceId));
  }
}

describe('Saved Services Service & Isolation Unit Tests', () => {
  let service: SavedServicesService;
  let mockRepo: MockSavedServicesRepository;

  beforeEach(() => {
    mockRepo = new MockSavedServicesRepository();
    service = new SavedServicesService(mockRepo);
  });

  test('User can save a service and check saved status', async () => {
    const userId = 'user_alice';
    const serviceId = 'srv_ac_repair';

    expect(await service.isServiceSaved(userId, serviceId)).toBe(false);

    const saved = await service.saveService(userId, serviceId);
    expect(saved).toBe(true);
    expect(await service.isServiceSaved(userId, serviceId)).toBe(true);

    const list = await service.getSavedServices(userId);
    expect(list.length).toBe(1);
    expect(list[0].serviceId).toBe(serviceId);
  });

  test('User can toggle saved service off (unsave)', async () => {
    const userId = 'user_alice';
    const serviceId = 'srv_ac_repair';

    await service.saveService(userId, serviceId);
    expect(await service.isServiceSaved(userId, serviceId)).toBe(true);

    const toggled = await service.toggleSavedService(userId, serviceId, true);
    expect(toggled).toBe(true);
    expect(await service.isServiceSaved(userId, serviceId)).toBe(false);
  });

  test('Strict User Isolation: User A cannot see User B saved services', async () => {
    const userA = 'user_alice';
    const userB = 'user_bob';
    const serviceId = 'srv_ac_repair';

    await service.saveService(userA, serviceId);

    const userAList = await service.getSavedServices(userA);
    const userBList = await service.getSavedServices(userB);

    expect(userAList.length).toBe(1);
    expect(userBList.length).toBe(0);
    expect(await service.isServiceSaved(userB, serviceId)).toBe(false);
  });
});
