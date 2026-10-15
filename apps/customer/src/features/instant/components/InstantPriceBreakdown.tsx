/**
 * SERVENTICA — Instant Price Breakdown Component
 * Transparent, itemized pricing hold display
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ShieldCheck, Info } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { InstantQuote } from '../types/instant.types';

interface InstantPriceBreakdownProps {
  quote: InstantQuote;
}

export const InstantPriceBreakdown: React.FC<InstantPriceBreakdownProps> = ({ quote }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Price Summary</Text>

      {/* ITEM LIST */}
      <View style={styles.lineItemsContainer}>
        {quote.lineItems.map((item, idx) => (
          <View key={idx} style={styles.lineItemRow}>
            <Text style={styles.lineItemDesc}>{item.description}</Text>
            <Text style={styles.lineItemAmount}>₹{item.amount}</Text>
          </View>
        ))}

        {quote.tax > 0 ? (
          <View style={styles.lineItemRow}>
            <Text style={styles.lineItemDesc}>Taxes & GST (18%)</Text>
            <Text style={styles.lineItemAmount}>₹{quote.tax}</Text>
          </View>
        ) : null}

        {quote.discount > 0 ? (
          <View style={styles.lineItemRow}>
            <Text style={[styles.lineItemDesc, { color: '#059669' }]}>Instant Promotion</Text>
            <Text style={[styles.lineItemAmount, { color: '#059669' }]}>-₹{quote.discount}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* TOTAL PAYABLE */}
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total Payable Hold</Text>
          <Text style={styles.totalCaption}>Pre-authorized on card / UPI</Text>
        </View>
        <Text style={styles.totalValue}>₹{quote.totalPayable}</Text>
      </View>

      <View style={styles.guaranteeRow}>
        <ShieldCheck size={14} color="#059669" strokeWidth={2.4} />
        <Text style={styles.guaranteeText}>
          No charge if no specialist accepts within dispatch waves.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
    marginBottom: 10,
  },
  lineItemsContainer: {
    gap: 8,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemDesc: {
    fontSize: 12.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
  },
  lineItemAmount: {
    fontSize: 12.5,
    fontFamily: Fonts.SemiBold,
    color: '#1E242B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  totalCaption: {
    fontSize: 10.5,
    fontFamily: Fonts.Regular,
    color: '#94A3B8',
    marginTop: 1,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guaranteeText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#065F46',
  },
});
