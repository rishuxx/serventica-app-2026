import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Linking } from 'react-native';
import { Calendar, Clock, MapPin, ChevronRight, UserCheck } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { BookingRecord } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { formatBookingExactDateTime } from '../../../lib/date.utils';
import { BookingTicket } from '../../../components/BookingTicket';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';

interface UpcomingBookingCardProps {
  booking: BookingRecord;
  onPress: () => void;
}

export const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = ({
  booking,
  onPress,
}) => {
  const imageSource =
    booking.serviceImageUrl && AssetRegistry[booking.serviceImageUrl]
      ? AssetRegistry[booking.serviceImageUrl]
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

  const effectivePartner = booking.partner || (hasAssignedStatus ? {
    id: 'servs_partner_vipin_01',
    name: 'Vipin Sharma',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
    rating: 4.95,
    specialization: 'Certified Servs Specialist',
  } : null);

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

  const theme = isCancelled ? 'red' : isCompleted ? 'green' : 'purple';
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
