/**
 * SERVENTICA — Instant Review Card / Screen
 * Review requirements, address, truthful arrival, and transparent price before dispatch
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { MapPin, Clock, ShieldCheck, ChevronRight, Zap, AlertCircle } from 'lucide-react-native';
import { Fonts, ServenticaTokens } from '../../../../../../packages/design-system/src';
import { InstantServiceCatalogItem, InstantQuote } from '../types/instant.types';
import { InstantEtaCard } from './InstantEtaCard';
import { InstantPriceBreakdown } from './InstantPriceBreakdown';
import { LocationItem } from '../../../types/location.types';
import { getInstantServiceImage } from '../../../assets/images/instant';

interface InstantReviewCardProps {
  service: InstantServiceCatalogItem;
  requirementsSummary: string;
  location: LocationItem;
  quote: InstantQuote;
  isSubmitting: boolean;
  onSubmit: () => void;
  onChangeLocation?: () => void;
}

export const InstantReviewCard: React.FC<InstantReviewCardProps> = ({
  service,
  requirementsSummary,
  location,
  quote,
  isSubmitting,
  onSubmit,
  onChangeLocation,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. SERVICE HEADER */}
      <View style={styles.serviceHeaderCard}>
        <View style={styles.serviceIconContainer}>
          <Image
            source={getInstantServiceImage(service.slug)}
            style={styles.serviceImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.serviceTextCol}>
          <View style={styles.serviceBadgeRow}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <View style={styles.instantTag}>
              <Zap size={10} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.instantTagText}>INSTANT</Text>
            </View>
          </View>
          <Text style={styles.requirementsText}>{requirementsSummary}</Text>
        </View>
      </View>

      {/* 2. TRUTHFUL ETA */}
      <View style={styles.cardSection}>
        <InstantEtaCard arrivalMinutes={quote.estimatedArrivalMinutes} />
      </View>

      {/* 3. SERVICE ADDRESS / LOCATION */}
      <View style={styles.addressCard}>
        <View style={styles.addressIconCircle}>
          <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
        </View>
        <View style={styles.addressTextCol}>
          <Text style={styles.addressLabel}>SERVICE LOCATION</Text>
          <Text style={styles.addressLine} numberOfLines={2}>
            {location.formattedAddress || location.shortAddress || '42 Rajpur Road, Dehradun'}
          </Text>
        </View>
        {onChangeLocation ? (
          <TouchableOpacity
            style={styles.changeButton}
            onPress={onChangeLocation}
            disabled={isSubmitting}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 4. PRICE BREAKDOWN */}
      <View style={styles.cardSection}>
        <InstantPriceBreakdown quote={quote} />
      </View>

      {/* 5. POLICY NOTICES */}
      <View style={styles.policyNoticeCard}>
        <AlertCircle size={14} color="#64748B" strokeWidth={2.2} />
        <Text style={styles.policyNoticeText}>
          By tapping "Get Help Now", a dispatch offer wave is sent to available specialists nearby. Free cancellation applies for the first 60 seconds.
        </Text>
      </View>

      {/* 6. SINGLE SUBMIT ACTION WITH DOUBLE-TAP PROTECTION */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        activeOpacity={0.85}
        onPress={onSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={`Get Help Now, total payable hold ₹${quote.totalPayable}`}
      >
        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Connecting to Nearby Pros...</Text>
          </View>
        ) : (
          <View style={styles.buttonContentRow}>
            <View style={styles.btnLeft}>
              <Zap size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.submitButtonText}>Get Help Now</Text>
            </View>
            <View style={styles.btnRight}>
              <Text style={styles.btnPrice}>₹{quote.totalPayable}</Text>
              <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  serviceHeaderCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    marginBottom: 14,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceImage: {
    width: 42,
    height: 42,
  },
  serviceTextCol: {
    flex: 1,
  },
  serviceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  instantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  instantTagText: {
    fontSize: 9,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  requirementsText: {
    fontSize: 12.5,
    fontFamily: Fonts.Medium,
    color: '#64748B',
    marginTop: 3,
  },
  cardSection: {
    marginBottom: 14,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  addressIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextCol: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  addressLine: {
    fontSize: 13,
    fontFamily: Fonts.Medium,
    color: '#1E242B',
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeButtonText: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  policyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  policyNoticeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    lineHeight: 15,
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  btnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnPrice: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
});
