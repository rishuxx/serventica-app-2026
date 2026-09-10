import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {
  MapPin,
  X,
  Navigation,
  Check,
  Compass,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  fullAddress: string;
  city: string;
  isLoading?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  onRefreshLocation: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  fullAddress,
  city,
  isLoading = false,
  latitude = null,
  longitude = null,
  onRefreshLocation,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.titleRow}>
                  <Compass size={19} color='#1E242B' strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.sheetTitle}>Service Delivery Location</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  accessibilityLabel="Close location panel"
                >
                  <X size={20} color="#171717" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Current Active Location Card */}
              <View style={styles.currentCard}>
                <View style={styles.cardHeader}>
                  <MapPin size={18} color='#1E242B' strokeWidth={2.4} />
                  <Text style={styles.cardHeaderText}>Current GPS Location</Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color='#1E242B' />
                  ) : (
                    <View style={styles.checkBadge}>
                      <Check size={13} color="#ffffff" strokeWidth={2.8} />
                    </View>
                  )}
                </View>

                <Text style={styles.fullAddressText}>
                  {isLoading ? 'Acquiring GPS coordinates & reverse geocoding...' : fullAddress}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.cityBadge}>
                    City: <Text style={styles.cityBadgeHighlight}>{city}</Text>
                  </Text>
                  {latitude !== null && longitude !== null && (
                    <Text style={styles.coordsBadge}>
                      {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                    </Text>
                  )}
                </View>
              </View>

              {/* Action to re-detect location */}
              <TouchableOpacity
                style={[styles.refreshBtn, isLoading && styles.refreshBtnDisabled]}
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() => {
                  onRefreshLocation();
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color='#1E242B' style={{ marginRight: 8 }} />
                ) : (
                  <Navigation size={18} color='#1E242B' strokeWidth={2.2} />
                )}
                <Text style={styles.refreshBtnText}>
                  {isLoading ? 'Locating with GPS...' : 'Fetch Live GPS Location'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  closeBtn: {
    padding: 6,
  },
  currentCard: {
    backgroundColor: '#F7F7F5',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginLeft: 8,
    flex: 1,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E4B29',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullAddressText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#222222',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityBadge: {
    fontSize: 12,
    color: '#666666',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  cityBadgeHighlight: {
    color: '#1E242B',
    fontWeight: '600',
  },
  coordsBadge: {
    fontSize: 11,
    color: '#888888',
    fontFamily: ServenticaTokens.fonts.Medium,
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F6F6F4',
    borderWidth: 1,
    borderColor: '#E8E8E6',
  },
  refreshBtnDisabled: {
    opacity: 0.7,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    marginLeft: 8,
  },
});
