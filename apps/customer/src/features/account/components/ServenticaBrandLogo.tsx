import React from 'react';
import { StyleSheet, View, Image, ImageStyle, StyleProp } from 'react-native';

const TOP_LOGO = require('../../../assets/images/TopLogo.png');

interface ServenticaBrandLogoProps {
  tintColor?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ImageStyle>;
}

export const ServenticaBrandLogo: React.FC<ServenticaBrandLogoProps> = ({
  tintColor,
  color = '#FFFFFF',
  size = 'md',
  style,
}) => {
  const activeTint = tintColor || color;
  const dimensions =
    size === 'sm'
      ? { width: 90, height: 19 }
      : size === 'lg'
      ? { width: 124, height: 26 }
      : { width: 106, height: 22 };

  return (
    <View style={styles.container}>
      <Image
        source={TOP_LOGO}
        style={[
          styles.logoImage,
          dimensions,
          { tintColor: activeTint },
          style,
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  logoImage: {
    // Default tinting and containment
  },
});

export default ServenticaBrandLogo;

