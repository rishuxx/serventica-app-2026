import { ImageSourcePropType } from 'react-native';

export const InstantImages = {
  helpingHand: require('./helping-hand.webp'),
  roadHelp: require('./road-help.webp'),
  laundry: require('./laundry.webp'),
  packAndMove: require('./pack-and-move.webp'),
} as const;

export type InstantServiceSlug = 'helping-hand' | 'road-help' | 'laundry' | 'pack-move';

export const getInstantServiceImage = (slug?: string): ImageSourcePropType => {
  switch (slug) {
    case 'helping-hand':
      return InstantImages.helpingHand;
    case 'road-help':
      return InstantImages.roadHelp;
    case 'laundry':
      return InstantImages.laundry;
    case 'pack-move':
    case 'pack-and-move':
      return InstantImages.packAndMove;
    default:
      return InstantImages.helpingHand;
  }
};
