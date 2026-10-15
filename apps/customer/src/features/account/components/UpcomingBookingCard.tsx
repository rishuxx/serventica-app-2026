import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Linking } from 'react-native';
import { Calendar, Clock, MapPin, ChevronRight, UserCheck } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { BookingRecord } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { formatBookingExactDateTime } from '../../../lib/date.utils';
import { BookingTicket } from '../../../components/BookingTicket';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';
import { getInstantServiceImage } from '../../../assets/images/instant';

interface UpcomingBookingCardProps {
  booking: BookingRecord;
  onPress: () => void;
}

export const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = ({
  booking,
  onPress,
}) => {
  const isInstantSlug =
    ['helping-hand', 'instant-helping-hand', 'road-help', 'laundry', 'pack-move', 'pack-and-move'].includes(
      booking.serviceId?.toLowerCase() || booking.serviceSlug?.toLowerCase() || ''
    ) ||
    Boolean(booking.serviceName?.toLowerCase().includes('helping hand')) ||
    Boolean(booking.serviceName?.toLowerCase().includes('road help')) ||
    Boolean(booking.serviceName?.toLowerCase().includes('pack & move')) ||
    Boolean(booking.serviceName?.toLowerCase().includes('express laundry'));

  const isInstantService =
    (booking.fulfillmentMode === 'INSTANT' ||
     (booking as any).fulfillment_mode === 'INSTANT' ||
     booking.id.startsWith('inst_')) &&
    isInstantSlug;

  const instantSlug =
    booking.serviceSlug ||
    booking.serviceId ||
    (booking.serviceName?.toLowerCase().includes('helping hand')
      ? 'helping-hand'
      : booking.serviceName?.toLowerCase().includes('road help')
      ? 'road-help'
      : booking.serviceName?.toLowerCase().includes('laundry')
      ? 'laundry'
      : booking.serviceName?.toLowerCase().includes('pack')
      ? 'pack-move'
      : 'helping-hand');

  const imageSource =
    booking.serviceImageUrl && AssetRegistry[booking.serviceImageUrl]
      ? AssetRegistry[booking.serviceImageUrl]
      : isInstantService
      ? getInstantServiceImage(instantSlug)
      : AssetRegistry.basic_ac_repair;

  const formattedDate = formatBookingExactDateTime(
    booking.scheduledStartTime,
    booking.scheduledDate,
    booking.createdAt
  );

  const formatScheduleText = (b: BookingRecord) => {
    const time = b.scheduledStartTime;
    if (!time) return 'Scheduled Slot';
    if (time.toLowerCase().includes('express') || time.toLowerCase().includes('min')) {
      return time;
    }
    if (time.includes('T') || (time.includes('-') && time.includes(':'))) {
      try {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}
    }
    return time;
  };

  const itemCount = booking.items?.length || 1;
  const scheduleTimeDisplay = formatScheduleText(booking);

  const hasAssignedStatus =
    booking.status === 'PARTNER_ASSIGNED' ||
    booking.status === 'PARTNER_ACCEPTED' ||
    booking.status === 'PARTNER_EN_ROUTE' ||
    booking.status === 'PARTNER_ARRIVED' ||
    booking.status === 'SERVICE_STARTED';

  const effectivePartner = booking.partner || null;

  const hasAssignedPartner = Boolean(effectivePartner && (hasAssignedStatus || (booking.status !== 'CONFIRMED' && booking.status !== 'SEARCHING_PARTNER')));

  const isCancelled = Boolean(booking.status?.includes('CANCEL'));
  const isCompleted = booking.status === 'SERVICE_COMPLETED';

  const billBreakdown = PriceCalculationEngine.calculateBill({
    itemTotal: booking.payment?.subtotal,
    subtotal: booking.payment?.subtotal,
    discount: booking.payment?.discount,
    platformFee: booking.payment?.platformFee,
    total: booking.payment?.total,
    items: booking.items,
  });

  const theme = isCancelled
    ? 'red'
    : isCompleted
    ? 'green'
    : isInstantService
    ? 'yellow'
    : 'purple';
  const addressText =
    booking.address?.shortAddress ||
    booking.address?.formattedAddress ||
    booking.address?.addressLine1 ||
    booking.address?.title ||
    booking.address?.city ||
    'Service Address';

  return (
    <View style={styles.cardWrapper}>
      <BookingTicket
        theme={theme}
        status={booking.status}
        bookingId={`#${booking.bookingNumber}`}
        isInstant={isInstantService}
        datetime={formattedDate}
        thumbnail={imageSource}
        title={booking.serviceName}
        meta={[
          {
            icon: 'clock',
            text: `${scheduleTimeDisplay} • ${itemCount} ${itemCount === 1 ? 'service' : 'services'}`,
          },
          {
            icon: 'pin',
            text: addressText,
          },
        ]}
        totalLabel="TOTAL"
        total={`₹${billBreakdown.finalPayable}`}
        cancelInfo={
          isCancelled
            ? {
                title: 'Booking Cancelled',
                reason: booking.cancellationReason || 'Need to change date or time slot',
              }
            : undefined
        }
        technician={
          hasAssignedPartner && effectivePartner
            ? {
                name: effectivePartner.name,
                role: effectivePartner.specialization || 'Serventica Verified',
                avatar: effectivePartner.avatarUrl,
                onCall: effectivePartner.phone
                  ? () => {
                      const tel = effectivePartner.phone!.replace(/\s+/g, '');
                      Linking.openURL(`tel:${tel}`).catch(() => {});
                    }
                  : undefined,
                onTrack: onPress,
              }
            : undefined
        }
        assigning={
          !hasAssignedPartner && !isCancelled
            ? {
                title: 'Assigning Servs...',
                subtitle: 'Finding Servs within 5 km',
              }
            : undefined
        }
        onPress={onPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 10,
    marginBottom: 16,
  },
});
