import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import {
  MapPin,
  X,
  Navigation,
  Check,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  fullAddress: string;
  city: string;
  onRefreshLocation: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  fullAddress,
  city,
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
                <Text style={styles.sheetTitle}>Service Delivery Location</Text>
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
                  <MapPin size={18} color="#111111" strokeWidth={2.4} />
                  <Text style={styles.cardHeaderText}>Current Selected Location</Text>
                  <View style={styles.checkBadge}>
                    <Check size={14} color="#ffffff" strokeWidth={2.6} />
                  </View>
                </View>

                <Text style={styles.fullAddressText}>
                  {fullAddress}
                </Text>

                <Text style={styles.cityBadge}>City: {city}</Text>
              </View>

              {/* Action to re-detect location */}
              <TouchableOpacity
                style={styles.refreshBtn}
                activeOpacity={0.8}
                onPress={() => {
                  onRefreshLocation();
                  onClose();
                }}
              >
                <Navigation size={18} color="#111111" strokeWidth={2.2} />
                <Text style={styles.refreshBtnText}>Use Current GPS Location</Text>
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
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
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
    color: '#111111',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginLeft: 8,
    flex: 1,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullAddressText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 8,
  },
  cityBadge: {
    fontSize: 12,
    color: '#666666',
    fontFamily: ServenticaTokens.fonts.Medium,
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
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#111111',
    marginLeft: 8,
  },
});
