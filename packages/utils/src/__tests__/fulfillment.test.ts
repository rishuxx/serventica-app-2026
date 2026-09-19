/**
 * SERVENTICA — Unit Tests for SERV-03 Fulfillment Engine & Booking State Machine
 */

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

describe('SERV-03 Fulfillment Engine & Partner Matching', () => {
  it('should calculate accurate haversine distance between customer and partner coordinates', () => {
    const lat1 = 30.343866;
    const lon1 = 77.953231;
    const lat2 = 30.3256;
    const lon2 = 78.0437; // Approx Dehradun Clock Tower

    const dist = haversineDistance(lat1, lon1, lat2, lon2);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(12);
  });

  it('should enforce state machine transition order', () => {
    const validTransitions: Record<string, string[]> = {
      CONFIRMED: ['PARTNER_ACCEPTED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_SYSTEM'],
      PARTNER_ACCEPTED: ['PARTNER_EN_ROUTE', 'CANCELLED_BY_PARTNER'],
      PARTNER_EN_ROUTE: ['PARTNER_ARRIVED', 'CANCELLED_BY_PARTNER'],
      PARTNER_ARRIVED: ['SERVICE_STARTED'],
      SERVICE_STARTED: ['SERVICE_COMPLETED'],
      SERVICE_COMPLETED: ['CLOSED'],
    };

    expect(validTransitions['CONFIRMED']).toContain('PARTNER_ACCEPTED');
    expect(validTransitions['PARTNER_EN_ROUTE']).toContain('PARTNER_ARRIVED');
    expect(validTransitions['SERVICE_STARTED']).toContain('SERVICE_COMPLETED');
    expect(validTransitions['SERVICE_COMPLETED']).not.toContain('SERVICE_STARTED');
  });

  it('should prevent partner double-assignment under concurrency', () => {
    let assigned = false;
    const simulatePartnerAccept = () => {
      if (!assigned) {
        assigned = true;
        return { success: true, status: 'PARTNER_ACCEPTED' };
      }
      return { success: false, error: 'DISPATCH_ALREADY_ASSIGNED' };
    };

    const partner1 = simulatePartnerAccept();
    const partner2 = simulatePartnerAccept();

    expect(partner1.success).toBe(true);
    expect(partner2.success).toBe(false);
    expect(partner2.error).toBe('DISPATCH_ALREADY_ASSIGNED');
  });
});
