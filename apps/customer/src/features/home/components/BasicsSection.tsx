import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { HomeBasicServiceItem } from '../../../types/home.types';
import { AssetRegistry } from '../../../services/home.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';

const { width } = Dimensions.get('window');
// 4 items per row layout exactly matching reference screenshot
const ITEM_WIDTH = (width - 40 - 36) / 4;

interface BasicsSectionProps {
  basics: HomeBasicServiceItem[];
  onSelectService?: (service: HomeBasicServiceItem) => void;
}

export const BasicsSection: React.FC<BasicsSectionProps> = ({
  basics,
  onSelectService,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {basics.map((service) => {
          const imageSource = AssetRegistry[service.image_url] || AssetRegistry.basic_ac_repair;
          return (
            <AnimatedTouchable
              key={service.id}
              style={styles.itemWrapper}
              scaleTo={0.93}
              activeOpacity={0.85}
              onPress={() => onSelectService && onSelectService(service)}
              accessibilityLabel={service.name}
            >
              <View style={styles.iconContainer}>
                <Image source={imageSource} style={styles.serviceImage} resizeMode="contain" />
              </View>
              <Text style={styles.serviceName} numberOfLines={1}>
                {service.name}
              </Text>
              {service.short_tagline ? (
                <Text style={styles.serviceTagline} numberOfLines={1}>
                  {service.short_tagline}
                </Text>
              ) : null}
            </AnimatedTouchable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemWrapper: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 6,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceName: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
    fontWeight: '600',
    color: '#1E242B',
    textAlign: 'center',
  },
  serviceTagline: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: -0.1,
  },
});
