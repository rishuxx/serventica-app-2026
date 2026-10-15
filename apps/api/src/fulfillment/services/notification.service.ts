import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  public async notifyPartnerNewOffer(partnerId: string, offer: any): Promise<void> {
    try {
      this.logger.log(`[PUSH] Dispatched Instant Offer notification to partner ${partnerId} (Offer: ${offer.offerId})`);
    } catch (err: any) {
      this.logger.warn(`Failed to deliver push notification to partner ${partnerId}: ${err.message}`);
    }
  }

  public async notifyCustomerPartnerAssigned(customerId: string, booking: any, partner: any): Promise<void> {
    try {
      this.logger.log(`[PUSH] Partner ${partner.fullName} assigned to customer ${customerId} (Booking: ${booking.id})`);
    } catch (err: any) {
      this.logger.warn(`Failed to notify customer ${customerId}: ${err.message}`);
    }
  }

  public async notifyCustomerPartnerArrived(customerId: string, bookingId: string): Promise<void> {
    try {
      this.logger.log(`[PUSH] Partner arrived at doorstep for booking ${bookingId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to notify arrival for booking ${bookingId}: ${err.message}`);
    }
  }

  public async notifyWeightReconciliationRequired(
    customerId: string,
    bookingId: string,
    reconciliation: any
  ): Promise<void> {
    try {
      this.logger.log(
        `[PUSH] Laundry verified weight requires customer confirmation for booking ${bookingId} (Deviation: ${reconciliation.deviationPercent}%)`
      );
    } catch (err: any) {
      this.logger.warn(`Failed to notify customer of weight deviation: ${err.message}`);
    }
  }
}
