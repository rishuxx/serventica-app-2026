/**
 * SERVENTICA — Instant Extension Sheet / Modal
 * Allows in-service extension with truthful pricing and partner approval disclaimer
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, AlertCircle, Check, X, ShieldAlert } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';

const EXTENSION_OPTIONS = [
  { minutes: 30, label: '+30 Minutes', price: 30, hint: 'Quick finishing touches' },
  { minutes: 60, label: '+1 Hour', price: 59, hint: 'Additional task or room' },
];

interface InstantExtensionSheetProps {
  visible: boolean;
  onClose: () => void;
  onRequestExtension: (additionalMinutes: number) => Promise<boolean>;
}

export const InstantExtensionSheet: React.FC<InstantExtensionSheetProps> = ({
  visible,
  onClose,
  onRequestExtension,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 16 : 24
  );

  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [sentNotice, setSentNotice] = useState<boolean>(false);

  const selectedOption = EXTENSION_OPTIONS.find((o) => o.minutes === selectedMinutes) || EXTENSION_OPTIONS[0];

  const handleConfirm = async () => {
    setIsRequesting(true);
    const success = await onRequestExtension(selectedMinutes);
    setIsRequesting(false);
    if (success) {
      setSentNotice(true);
      setTimeout(() => {
        setSentNotice(false);
        onClose();
      }, 1600);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetContainer,
            {
              paddingBottom: bottomInset + 16,
              paddingLeft: Math.max(insets.left, 20),
              paddingRight: Math.max(insets.right, 20),
            },
          ]}
        >
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Need more time?</Text>
              <Text style={styles.sheetSubtitle}>
                Request extra time with your current specialist
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {sentNotice ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Check size={20} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.successTitle}>Extension Request Sent!</Text>
              <Text style={styles.successSubtitle}>
                Waiting for specialist approval. Timer will automatically update once accepted.
              </Text>
            </View>
          ) : (
            <>
              {/* OPTIONS */}
              <View style={styles.optionsList}>
                {EXTENSION_OPTIONS.map((opt) => {
                  const isSelected = selectedMinutes === opt.minutes;
                  return (
                    <TouchableOpacity
                      key={opt.minutes}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      activeOpacity={0.8}
                      onPress={() => setSelectedMinutes(opt.minutes)}
                    >
                      <Clock
                        size={18}
                        color={isSelected ? '#7C3AED' : '#64748B'}
                        strokeWidth={2.4}
                      />
                      <View style={styles.optionTextCol}>
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.optionHint}>{opt.hint}</Text>
                      </View>
                      <Text style={[styles.optionPrice, isSelected && styles.optionPriceSelected]}>
                        +₹{opt.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* DISCLAIMER (Section 7: Do not imply extension is guaranteed) */}
              <View style={styles.disclaimerCard}>
                <ShieldAlert size={14} color="#D97706" strokeWidth={2.4} />
                <Text style={styles.disclaimerText}>
                  Partner must approve based on their upcoming schedule. Extensions are subject to specialist availability.
                </Text>
              </View>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                style={[styles.requestBtn, isRequesting && styles.requestBtnDisabled]}
                onPress={handleConfirm}
                disabled={isRequesting}
                activeOpacity={0.85}
              >
                {isRequesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.requestBtnText}>
                    Request Extension (+₹{selectedOption.price})
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  sheetSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  optionTextCol: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: Fonts.SemiBold,
    color: '#1E242B',
  },
  optionLabelSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  optionHint: {
    fontSize: 11.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  optionPriceSelected: {
    color: '#7C3AED',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#92400E',
    lineHeight: 15,
  },
  requestBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  requestBtnText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  successSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
