/**
 * SERVENTICA — InstantHubScreen
 * Master customer-facing on-demand Instant platform hub coordinating the full lifecycle:
 * Hub -> Configuration -> Authoritative Quote -> Review -> Matching Radar -> Active Tracking -> Completion
 */

import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, MapPin, ChevronDown } from 'lucide-react-native';
import { Fonts, ServenticaTokens } from '../../../../../../packages/design-system/src';
import { SelectLocationScreen } from '../../location/screens/SelectLocationScreen';
import {
  InstantRequestProvider,
  useInstantRequest,
} from '../context/InstantRequestContext';
import { HelpingHandForm } from '../components/HelpingHandForm';
import { RoadHelpForm } from '../components/RoadHelpForm';
import { LaundryForm } from '../components/LaundryForm';
import { PackMoveForm } from '../components/PackMoveForm';
import { InstantReviewCard } from '../components/InstantReviewCard';
import { InstantMatchingView } from '../components/InstantMatchingView';
import { InstantActiveBookingView } from '../components/InstantActiveBookingView';
import { InstantExtensionSheet } from '../components/InstantExtensionSheet';
import { InstantErrorState } from '../components/InstantErrorState';
import { useLocation } from '../../../context/LocationContext';
import { LocationItem } from '../../../types/location.types';
import { getInstantServiceImage } from '../../../assets/images/instant';

const getServiceSubtitle = (slug?: string, fallback = '') => {
  switch (slug) {
    case 'helping-hand':
      return 'Household help & daily chores';
    case 'road-help':
      return 'Emergency fuel & breakdown support';
    case 'laundry':
      return 'Doorstep wash & dry pickup';
    case 'pack-move':
      return 'Shifting, loading & helper hands';
    default:
      return fallback || 'On-demand instant service';
  }
};

const getServiceBadge = (slug?: string) => {
  switch (slug) {
    case 'helping-hand':
      return 'Popular';
    case 'road-help':
      return 'Emergency';
    case 'laundry':
      return 'Express';
    case 'pack-move':
      return 'Heavy Duty';
    default:
      return 'Popular';
  }
};

const getServiceStartingPrice = (slug?: string, fallback = 59) => {
  switch (slug) {
    case 'helping-hand':
      return 59;
    case 'road-help':
      return 99;
    case 'laundry':
      return 79;
    case 'pack-move':
      return 149;
    default:
      return fallback || 59;
  }
};

const getServiceEta = (slug?: string) => {
  switch (slug) {
    case 'helping-hand':
      return '9–15m';
    case 'road-help':
      return '10–20m';
    case 'laundry':
      return '15–20m';
    case 'pack-move':
      return '15–25m';
    default:
      return '9–15m';
  }
};

interface InstantHubScreenContentProps {
  onBack: () => void;
  categorySlug?: string;
  onOpenSandbox?: () => void;
}

const InstantHubScreenContent: React.FC<InstantHubScreenContentProps> = ({
  onBack,
  categorySlug,
  onOpenSandbox,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 16 : 24
  );

  const { activeLocation, openSelectLocation, isSelectLocationOpen, closeSelectLocation } = useLocation();
  const {
    step,
    catalog,
    isCatalogLoading,
    selectedService,
    helpingHandConfig,
    roadHelpConfig,
    laundryConfig,
    packMoveConfig,
    quote,
    isQuoteLoading,
    isSubmitting,
    matchingState,
    activeBooking,
    error,
    serviceRemainingSeconds,
    isExtensionModalOpen,

    loadCatalog,
    selectService,
    updateHelpingHandConfig,
    updateRoadHelpConfig,
    updateLaundryConfig,
    updatePackMoveConfig,
    fetchQuote,
    submitDispatch,
    retryMatching,
    requestExtension,
    cancelActiveBooking,
    openExtensionModal,
    closeExtensionModal,
    navigateStep,
    resetToHub,
  } = useInstantRequest();

  // Auto-select service when navigated directly from Home 2x2 grid
  useEffect(() => {
    if (categorySlug && catalog && catalog.length > 0) {
      const match = catalog.find(
        (c) => c.slug === categorySlug || (categorySlug.includes('clean') && c.slug === 'helping-hand')
      );
      if (match && selectedService?.slug !== match.slug) {
        selectService(match.slug);
      }
    }
  }, [categorySlug, catalog, selectedService?.slug, selectService]);

  // Android Hardware Back Button Handling
  useEffect(() => {
    const onBackPress = () => {
      if (step === 'ACTIVE') {
        onBack();
        return true;
      }
      if (step === 'MATCHING') {
        cancelActiveBooking('Customer cancelled matching');
        onBack();
        return true;
      }
      if (step === 'REVIEW') {
        navigateStep('CONFIG');
        return true;
      }
      if (step === 'CONFIG') {
        onBack();
        return true;
      }
      onBack();
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [step, onBack, cancelActiveBooking, navigateStep]);

  // Compute textual requirements summary for Review Screen
  const getRequirementsSummary = (): string => {
    if (!selectedService) return '';
    switch (selectedService.slug) {
      case 'helping-hand':
        return `${helpingHandConfig.selectedTasks.join(', ')} • ${helpingHandConfig.durationMinutes} mins`;
      case 'road-help':
        if (roadHelpConfig.subservice === 'FUEL') {
          return `Emergency Fuel (1L ${roadHelpConfig.fuelType})`;
        }
        return `${roadHelpConfig.breakdownIssue} (${roadHelpConfig.vehicleType})`;
      case 'laundry':
        return `Doorstep Pickup (${laundryConfig.loadLabel})`;
      case 'pack-move':
        return `${packMoveConfig.needs.join(', ')} • ${packMoveConfig.helperCount} Helper(s) • ${packMoveConfig.durationMinutes} mins`;
      default:
        return 'Standard Instant Request';
    }
  };

  // Render Form based on selected service
  const renderConfigForm = () => {
    if (!selectedService) return null;
    switch (selectedService.slug) {
      case 'helping-hand':
        return (
          <HelpingHandForm
            config={helpingHandConfig}
            onChange={updateHelpingHandConfig}
          />
        );
      case 'road-help':
        return (
          <RoadHelpForm
            config={roadHelpConfig}
            onChange={updateRoadHelpConfig}
          />
        );
      case 'laundry':
        return (
          <LaundryForm
            config={laundryConfig}
            onChange={updateLaundryConfig}
          />
        );
      case 'pack-move':
        return (
          <PackMoveForm
            config={packMoveConfig}
            onChange={updatePackMoveConfig}
          />
        );
      default:
        return null;
    }
  };

  // RENDER STEP: MATCHING RADAR
  if (step === 'MATCHING') {
    return (
      <InstantMatchingView
        matchingState={matchingState}
        serviceTitle={selectedService?.title || 'Instant Service'}
        addressLine={activeLocation.shortAddress || 'Current Location'}
        onRetry={retryMatching}
        onScheduleForLater={onBack}
        onChangeService={onBack}
        onCancel={() => {
          cancelActiveBooking('Customer cancelled matching');
          onBack();
        }}
        onOpenSandbox={onOpenSandbox}
      />
    );
  }

  // RENDER STEP: ACTIVE SERVICE & TRACKING / COMPLETED
  if ((step === 'ACTIVE' || step === 'COMPLETED') && activeBooking) {
    return (
      <>
        <InstantActiveBookingView
          booking={activeBooking}
          serviceRemainingSeconds={serviceRemainingSeconds}
          onOpenExtension={openExtensionModal}
          onCancelBooking={(reason) => cancelActiveBooking(reason)}
          onBack={onBack}
        />
        <InstantExtensionSheet
          visible={isExtensionModalOpen}
          onClose={closeExtensionModal}
          onRequestExtension={requestExtension}
        />
      </>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF50F"
        translucent={Platform.OS === 'android'}
      />

      {/* TOP FULL-WIDTH YELLOW CONTAINER TOUCHING TILL TOP */}
      <View
        style={[
          styles.topYellowContainer,
          {
            paddingTop: topInset + 6,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        {/* TOP NAVIGATION ROW */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'REVIEW') {
                navigateStep('CONFIG');
              } else {
                onBack();
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#000000" strokeWidth={2.6} />
          </TouchableOpacity>

          {/* LOCATION CHIP */}
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={openSelectLocation}
            activeOpacity={0.8}
          >
            <MapPin size={13} color="#7C3AED" strokeWidth={2.4} />
            <Text style={styles.locationText} numberOfLines={1}>
              {activeLocation.shortAddress || 'Select Location'}
            </Text>
            <ChevronDown size={13} color="#000000" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.instantLogoBadge}>
            <Zap size={12} color="#FFF50F" fill="#FFF50F" />
            <Text style={styles.instantLogoText}>INSTANT</Text>
          </View>
        </View>

        {/* YELLOW HERO CARD CONTENT FOR ACTIVE SERVICE */}
        {selectedService && (
          <View style={styles.yellowHeroCard}>
            {/* LEFT: MASTER POP-ART ILLUSTRATION */}
            <View style={styles.yellowHeroIconBox}>
              <Image
                source={getInstantServiceImage(selectedService.slug)}
                style={styles.yellowHeroImage}
                resizeMode="contain"
              />
            </View>

            {/* RIGHT: TITLE, SUBTITLE, BADGES, PRICE */}
            <View style={styles.yellowHeroContentCol}>
              <View style={styles.yellowHeroTitleRow}>
                <Text style={styles.yellowHeroTitle} numberOfLines={1}>
                  {selectedService.title}
                </Text>
                <View style={styles.yellowHeroBadgePill}>
                  <Text style={styles.yellowHeroBadgeText}>
                    {getServiceBadge(selectedService.slug)}
                  </Text>
                </View>
              </View>

              <Text style={styles.yellowHeroSubtitle} numberOfLines={2}>
                {getServiceSubtitle(selectedService.slug, selectedService.subtitle)}
              </Text>

              <View style={styles.yellowHeroBottomRow}>
                <View style={styles.yellowHeroEtaPill}>
                  <Zap size={12} color="#000000" fill="#000000" strokeWidth={2.4} />
                  <Text style={styles.yellowHeroEtaText}>
                    {getServiceEta(selectedService.slug)}
                  </Text>
                </View>

                <View style={styles.yellowHeroPriceCol}>
                  <Text style={styles.yellowHeroPricePrefix}>From</Text>
                  <Text style={styles.yellowHeroPriceValue}>
                    ₹{getServiceStartingPrice(selectedService.slug, selectedService.startingPrice)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* SCROLL AREA WITH PURPLE BACKGROUND */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomInset + 32,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ERROR CARD IF ANY */}
        {error ? (
          <InstantErrorState
            error={error}
            onRetry={() => loadCatalog()}
            onBackToHub={onBack}
          />
        ) : null}

        {/* STEP 2: CONFIGURATION FORM */}
        {step === 'CONFIG' && selectedService && (
          <View>
            {renderConfigForm()}

            {/* BOTTOM PROCEED BUTTON */}
            <TouchableOpacity
              style={styles.proceedButton}
              activeOpacity={0.85}
              onPress={() => fetchQuote(activeLocation)}
              disabled={isQuoteLoading}
            >
              {isQuoteLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.proceedButtonText}>Review Instant Quote</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: REVIEW SCREEN */}
        {step === 'REVIEW' && selectedService && quote && (
          <InstantReviewCard
            service={selectedService}
            requirementsSummary={getRequirementsSummary()}
            location={activeLocation}
            quote={quote}
            isSubmitting={isSubmitting}
            onSubmit={() => submitDispatch(activeLocation)}
            onChangeLocation={openSelectLocation}
          />
        )}
      </ScrollView>

      {/* LOCATION SELECTION MODAL */}
      <Modal
        visible={isSelectLocationOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeSelectLocation}
      >
        <SelectLocationScreen onClose={closeSelectLocation} />
      </Modal>
    </View>
  );
};

export const InstantHubScreen: React.FC<InstantHubScreenContentProps> = (props) => {
  return (
    <InstantRequestProvider initialServiceSlug={props.categorySlug}>
      <InstantHubScreenContent {...props} />
    </InstantRequestProvider>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#C89FFB', // Screen purple background behind rounded corners
  },
  topYellowContainer: {
    width: '100%',
    backgroundColor: '#FFF50F',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    overflow: 'hidden',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#000000',
  },
  instantLogoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    gap: 3,
  },
  instantLogoText: {
    fontSize: 10,
    fontFamily: Fonts.Black,
    color: '#FFF50F',
    letterSpacing: 0.6,
  },

  yellowHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  yellowHeroIconBox: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yellowHeroImage: {
    width: 108,
    height: 108,
  },
  yellowHeroContentCol: {
    flex: 1,
  },
  yellowHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yellowHeroTitle: {
    fontSize: 22,
    fontFamily: Fonts.Black,
    color: '#000000',
    letterSpacing: -0.4,
    flex: 1,
  },
  yellowHeroBadgePill: {
    backgroundColor: '#FDBDDF', // Bubblegum pink pastel pill matching user Image 1
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 14,
    marginLeft: 8,
  },
  yellowHeroBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#000000',
  },
  yellowHeroSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#111111',
    marginTop: 2,
    lineHeight: 17,
  },
  yellowHeroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  yellowHeroEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCB2FC', // Soft lavender purple pill matching user Image 1
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  yellowHeroEtaText: {
    fontSize: 11.5,
    fontFamily: Fonts.Bold,
    color: '#000000',
  },
  yellowHeroPriceCol: {
    alignItems: 'flex-end',
  },
  yellowHeroPricePrefix: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#000000',
    lineHeight: 12,
  },
  yellowHeroPriceValue: {
    fontSize: 22,
    fontFamily: Fonts.Black,
    color: '#000000',
    lineHeight: 25,
    letterSpacing: -0.4,
  },

  scrollArea: {
    flex: 1,
    backgroundColor: '#C89FFB', // Entire page background to purple!
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  proceedButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonText: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
