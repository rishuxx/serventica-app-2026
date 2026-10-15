import React from 'react';
import { InstantHubScreen } from '../../instant/screens/InstantHubScreen';

interface InstantFulfillmentScreenProps {
  onBack: () => void;
  categoryName?: string;
  categorySlug?: string;
  onOpenSandbox?: () => void;
}

export const InstantFulfillmentScreen: React.FC<InstantFulfillmentScreenProps> = ({
  onBack,
  categoryName = 'Cleaning & Househelp',
  categorySlug = 'home-cleaning',
  onOpenSandbox,
}) => {
  return (
    <InstantHubScreen
      onBack={onBack}
      categorySlug={categorySlug}
      onOpenSandbox={onOpenSandbox}
    />
  );
};
