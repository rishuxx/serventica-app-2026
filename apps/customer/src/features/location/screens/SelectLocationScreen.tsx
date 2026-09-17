import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  X,
  LocateFixed,
  Plus,
  Home,
  Briefcase,
  MapPin,
  MoreVertical,
  ChevronRight,
  Check,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { useLocation } from '../../../context/LocationContext';
import {
  LocationItem,
  SavedAddressItem,
  CreateAddressInput,
  AddressLabel,
} from '../../../types/location.types';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { MapLocationPickerModal } from '../components/MapLocationPickerModal';

interface SelectLocationScreenProps {
  onClose: () => void;
}

export const SelectLocationScreen: React.FC<SelectLocationScreenProps> = ({ onClose }) => {
  const {
    activeLocation,
    savedAddresses,
    currentGpsLocation,
    gpsState,
    gpsErrorMessage,
    isSearching,
    searchQuery,
    searchResults,
    setSearchQuery,
    clearSearch,
    fetchCurrentGPS,
    selectLocation,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
  } = useLocation();

  // Add Address Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formHouse, setFormHouse] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formLabel, setFormLabel] = useState<AddressLabel>('Home');
  const [isSaving, setIsSaving] = useState(false);
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Map Location Picker State
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [mapModalContext, setMapModalContext] = useState<'SELECT' | 'FORM'>('SELECT');

  const handleOpenMap = (context: 'SELECT' | 'FORM' = 'SELECT') => {
    setMapModalContext(context);
    setIsMapModalOpen(true);
  };

  const handleConfirmMapLocation = async (loc: LocationItem) => {
    setIsMapModalOpen(false);
    if (mapModalContext === 'FORM') {
      setFormHouse(loc.houseNumber || '');
      setFormStreet(loc.road || loc.shortAddress || '');
      setFormCity(loc.city || '');
      setFormState(loc.state || '');
      setFormPincode(loc.postalCode || '');
      setTargetCoords(
        loc.latitude && loc.longitude
          ? { lat: loc.latitude, lon: loc.longitude }
          : null
      );
    } else {
      const isServiceable = await selectLocation(loc);
      if (!isServiceable) {
        setUnserviceableLocation(loc);
      } else {
        onClose();
      }
    }
  };

  // Address Options / Overflow Action Sheet
  const [selectedAddressForOptions, setSelectedAddressForOptions] = useState<SavedAddressItem | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<SavedAddressItem | null>(null);

  // Unserviceable Notice Modal
  const [unserviceableLocation, setUnserviceableLocation] = useState<LocationItem | null>(null);

  // Initialize Add Address Form from a Location
  const openAddAddressWithLocation = (loc?: LocationItem | null) => {
    const base = loc || currentGpsLocation || activeLocation;
    setFormHouse(base?.houseNumber || '');
    setFormStreet(base?.road || base?.shortAddress || '');
    setFormLandmark(base?.landmark || '');
    setFormCity(base?.city || '');
    setFormState(base?.state || '');
    setFormPincode(base?.postalCode || '');
    setFormLabel('Home');
    setTargetCoords(
      base?.latitude && base?.longitude
        ? { lat: base.latitude, lon: base.longitude }
        : null
    );
    setIsAddModalOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!formStreet.trim() || !formCity.trim()) {
      Alert.alert('Required Fields', 'Please enter street/area and city.');
      return;
    }

    setIsSaving(true);
    try {
      const formatted = [
        formHouse,
        formStreet,
        formLandmark,
        formCity,
        formState,
        formPincode,
        'India',
      ]
        .filter(Boolean)
        .join(', ');

      const input: CreateAddressInput = {
        title: formLabel,
        addressLine1: formHouse ? `${formHouse}, ${formStreet}` : formStreet,
        addressLine2: formLandmark || undefined,
        landmark: formLandmark || undefined,
        city: formCity,
        state: formState || 'State',
        pincode: formPincode || '000000',
        latitude: targetCoords?.lat ?? (activeLocation?.latitude || 28.6139),
        longitude: targetCoords?.lon ?? (activeLocation?.longitude || 77.2090),
        formattedAddress: formatted,
        isDefault: true,
      };

      await saveAddress(input);
      setIsAddModalOpen(false);
      onClose();
    } catch (err) {
      console.warn('Save address error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSearchResult = async (item: LocationItem) => {
    const isServiceable = await selectLocation(item);
    if (!isServiceable) {
      setUnserviceableLocation(item);
    } else {
      onClose();
    }
  };

  const handleSelectSavedAddress = async (item: SavedAddressItem) => {
    const isServiceable = await selectLocation(item);
    if (!isServiceable) {
      setUnserviceableLocation(item);
    } else {
      onClose();
    }
  };

  const handleUseCurrentGPS = async () => {
    const loc = await fetchCurrentGPS();
    if (loc) {
      const isServiceable = await selectLocation(loc);
      if (!isServiceable) {
        setUnserviceableLocation(loc);
      } else {
        onClose();
      }
    }
  };

  const renderAddressIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('home')) {
      return <Home size={19} color="#1E4B29" strokeWidth={2.2} />;
    }
    if (lower.includes('work') || lower.includes('office')) {
      return <Briefcase size={19} color="#1E4B29" strokeWidth={2.2} />;
    }
    return <MapPin size={19} color="#1E4B29" strokeWidth={2.2} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SELECT DELIVERY LOCATION</Text>
      </View>

      {/* 2. REAL SEARCH INPUT */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#777777" strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for location"
            placeholderTextColor="#888888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search for address or location"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#777777" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. CONTENT AREA */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* If user is actively searching, render Search Results */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchResultsSection}>
            {isSearching ? (
              <View style={styles.searchingState}>
                <ActivityIndicator size="small" color="#1E4B29" />
                <Text style={styles.searchingText}>Searching locations...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, index) => (
                <TouchableOpacity
                  key={`search_${index}_${item.latitude}_${item.longitude}`}
                  style={styles.searchResultItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View style={styles.searchResultIconBox}>
                    <MapPin size={18} color="#555555" strokeWidth={2.2} />
                  </View>
                  <View style={styles.searchResultTextBox}>
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {item.shortAddress}
                    </Text>
                    <Text style={styles.searchResultSubtitle} numberOfLines={2}>
                      {item.formattedAddress}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#999999" strokeWidth={2.0} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptySearchState}>
                <Text style={styles.emptySearchTitle}>No matching locations found</Text>
                <Text style={styles.emptySearchSubtitle}>
                  Try searching with area name, street, or city.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Normal Location Management View */
          <>
            {/* Action 1: Use Current Location */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={handleUseCurrentGPS}
              accessibilityRole="button"
              accessibilityLabel="Use my current GPS location"
            >
              <View style={styles.actionCardLeft}>
                <View style={styles.locateIconBox}>
                  {gpsState === 'LOCATING' ? (
                    <ActivityIndicator size="small" color="#1E4B29" />
                  ) : (
                    <LocateFixed size={20} color="#1E4B29" strokeWidth={2.4} />
                  )}
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionPrimaryText}>
                    {gpsState === 'LOCATING'
                      ? 'Finding your location...'
                      : 'Use current location'}
                  </Text>
                  {currentGpsLocation ? (
                    <Text style={styles.actionSecondaryText} numberOfLines={1}>
                      {currentGpsLocation.shortAddress}
                    </Text>
                  ) : gpsErrorMessage ? (
                    <Text style={styles.actionErrorText} numberOfLines={1}>
                      {gpsErrorMessage}
                    </Text>
                  ) : null}
                </View>
              </View>

              {gpsState === 'PERMANENTLY_DENIED' ? (
                <TouchableOpacity
                  style={styles.settingsBadge}
                  onPress={() => Linking.openSettings()}
                >
                  <Text style={styles.settingsBadgeText}>Settings</Text>
                </TouchableOpacity>
              ) : (
                <ChevronRight size={18} color="#999999" strokeWidth={2.0} />
              )}
            </TouchableOpacity>

            {/* Action 2: Choose on Map */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => handleOpenMap('SELECT')}
              accessibilityRole="button"
              accessibilityLabel="Choose location on interactive map"
            >
              <View style={styles.actionCardLeft}>
                <View style={[styles.locateIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <MapPin size={20} color="#D97706" strokeWidth={2.4} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionPrimaryText}>Choose on Map</Text>
                  <Text style={styles.actionSecondaryText} numberOfLines={1}>
                    Pin exact address on real interactive map
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#999999" strokeWidth={2.0} />
            </TouchableOpacity>

            {/* Action 3: Add New Address Header Button */}
            <View style={styles.savedSectionHeaderRow}>
              <Text style={styles.savedSectionTitle}>Saved addresses</Text>
              <TouchableOpacity
                style={styles.addNewBtn}
                activeOpacity={0.7}
                onPress={() => openAddAddressWithLocation(null)}
                accessibilityRole="button"
                accessibilityLabel="Add New Address"
              >
                <Plus size={15} color="#1E4B29" strokeWidth={2.6} />
                <Text style={styles.addNewBtnText}>ADD NEW ADDRESS</Text>
              </TouchableOpacity>
            </View>

            {/* Saved Addresses List */}
            {savedAddresses.length > 0 ? (
              savedAddresses.map((addr) => {
                const isSelected =
                  activeLocation?.formattedAddress === addr.formattedAddress ||
                  (activeLocation?.latitude === addr.latitude &&
                    activeLocation?.longitude === addr.longitude &&
                    addr.latitude != null);

                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressCard,
                      isSelected && styles.addressCardSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectSavedAddress(addr)}
                  >
                    <View style={styles.addressCardTopRow}>
                      <View style={styles.addressTitleRow}>
                        <View style={styles.addressIconContainer}>
                          {renderAddressIcon(addr.title)}
                        </View>
                        <Text style={styles.addressTitle}>{addr.title}</Text>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>SELECTED</Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.overflowButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => setSelectedAddressForOptions(addr)}
                        accessibilityLabel="Address options"
                      >
                        <MoreVertical size={18} color="#777777" strokeWidth={2.2} />
                      </TouchableOpacity>
                    </View>

                    {/* Address Text */}
                    <Text style={styles.addressDetailsText} numberOfLines={2}>
                      {addr.formattedAddress}
                    </Text>

                    {/* Distance Badge */}
                    {addr.distanceFormatted && (
                      <View style={styles.distanceRow}>
                        <Text style={styles.distanceText}>
                          {addr.distanceFormatted}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptySavedState}>
                <MapPin size={32} color="#CCCCCC" strokeWidth={1.8} style={{ marginBottom: 8 }} />
                <Text style={styles.emptySavedTitle}>No saved addresses yet</Text>
                <Text style={styles.emptySavedSubtitle}>
                  Save your home, work, or favorite locations for 1-tap checkout.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 4. ADD ADDRESS MODAL / SHEET */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Address Details</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color='#1E242B' strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              {/* Pick on Map Fast Action Button */}
              <TouchableOpacity
                style={styles.pickOnMapBtn}
                activeOpacity={0.8}
                onPress={() => handleOpenMap('FORM')}
              >
                <MapPin size={16} color="#1E4B29" strokeWidth={2.2} />
                <Text style={styles.pickOnMapText}>
                  {targetCoords ? 'Adjust Pin on Map' : 'Select Exact Location on Map'}
                </Text>
              </TouchableOpacity>

              {/* Label Selector */}
              <Text style={styles.fieldLabel}>Save As</Text>
              <View style={styles.labelSelectorRow}>
                {(['Home', 'Work', 'Other'] as AddressLabel[]).map((lbl) => (
                  <TouchableOpacity
                    key={lbl}
                    style={[
                      styles.labelChip,
                      formLabel === lbl && styles.labelChipActive,
                    ]}
                    onPress={() => setFormLabel(lbl)}
                  >
                    <Text
                      style={[
                        styles.labelChipText,
                        formLabel === lbl && styles.labelChipTextActive,
                      ]}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Fields */}
              <Text style={styles.fieldLabel}>Flat / House / Building No.</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Flat 402, Tower B"
                placeholderTextColor="#999999"
                value={formHouse}
                onChangeText={setFormHouse}
              />

              <Text style={styles.fieldLabel}>Street / Area *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Rajpur Road, Jakhan"
                placeholderTextColor="#999999"
                value={formStreet}
                onChangeText={setFormStreet}
              />

              <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Near Pacific Mall"
                placeholderTextColor="#999999"
                value={formLandmark}
                onChangeText={setFormLandmark}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Dehradun"
                    placeholderTextColor="#999999"
                    value={formCity}
                    onChangeText={setFormCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Pincode</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 248001"
                    placeholderTextColor="#999999"
                    keyboardType="number-pad"
                    value={formPincode}
                    onChangeText={setFormPincode}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveSubmitBtn, isSaving && styles.saveSubmitBtnDisabled]}
                disabled={isSaving}
                onPress={handleSaveAddress}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveSubmitBtnText}>Save and Deliver Here</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. ADDRESS OPTIONS / OVERFLOW SHEET */}
      <Modal
        visible={selectedAddressForOptions !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAddressForOptions(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedAddressForOptions(null)}
        >
          <View style={styles.optionsSheet}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>
                {selectedAddressForOptions?.title} Address
              </Text>
              <TouchableOpacity onPress={() => setSelectedAddressForOptions(null)}>
                <X size={18} color="#777777" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionActionRow}
              onPress={() => {
                if (selectedAddressForOptions) {
                  setDefaultAddress(selectedAddressForOptions.id);
                  setSelectedAddressForOptions(null);
                }
              }}
            >
              <CheckCircle2 size={18} color="#1E4B29" strokeWidth={2.2} />
              <Text style={styles.optionActionText}>Set as Default Address</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionActionRow}
              onPress={() => {
                const addr = selectedAddressForOptions;
                setSelectedAddressForOptions(null);
                if (addr) {
                  setAddressToDelete(addr);
                }
              }}
            >
              <Trash2 size={18} color="#D32F2F" strokeWidth={2.2} />
              <Text style={[styles.optionActionText, { color: '#D32F2F' }]}>
                Delete Address
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 6. DELETE CONFIRMATION MODAL */}
      <Modal
        visible={addressToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressToDelete(null)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Delete Address?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete {addressToDelete?.title} address?
            </Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setAddressToDelete(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={async () => {
                  if (addressToDelete) {
                    await deleteAddress(addressToDelete.id);
                    setAddressToDelete(null);
                  }
                }}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. UNSERVICEABLE LOCATION NOTICE MODAL */}
      <Modal
        visible={unserviceableLocation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUnserviceableLocation(null)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.unserviceableDialog}>
            <AlertCircle size={36} color="#E65100" strokeWidth={2.0} style={{ marginBottom: 12 }} />
            <Text style={styles.unserviceableTitle}>Serventica isn't available here yet</Text>
            <Text style={styles.unserviceableMessage}>
              We are currently expanding rapidly across key cities. We'll be in {unserviceableLocation?.city || 'this area'} soon!
            </Text>
            <TouchableOpacity
              style={styles.unserviceableBtn}
              onPress={() => setUnserviceableLocation(null)}
            >
              <Text style={styles.unserviceableBtnText}>Choose Another Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 8. INTERACTIVE REAL-TIME MAP PICKER MODAL */}
      <MapLocationPickerModal
        visible={isMapModalOpen}
        initialLocation={
          mapModalContext === 'FORM' && targetCoords
            ? {
                latitude: targetCoords.lat,
                longitude: targetCoords.lon,
                shortAddress: formStreet || 'Selected Location',
                formattedAddress: `${formHouse ? formHouse + ', ' : ''}${formStreet}, ${formCity}`,
                city: formCity,
              }
            : activeLocation || currentGpsLocation
        }
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={handleConfirmMapLocation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    letterSpacing: 0.3,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E6E4',
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Action Cards (Use Current Location)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAE8',
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF3ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextBox: {
    flex: 1,
  },
  actionPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E4B29',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  actionSecondaryText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginTop: 2,
  },
  actionErrorText: {
    fontSize: 12,
    color: '#D32F2F',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginTop: 2,
  },
  settingsBadge: {
    backgroundColor: '#1E4B29',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Saved Section
  savedSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  savedSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addNewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E4B29',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  // Address Cards
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECE8',
  },
  addressCardSelected: {
    borderColor: '#1E4B29',
    backgroundColor: '#F7FAF8',
  },
  addressCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EBF3ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  selectedBadge: {
    backgroundColor: '#E2EFE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E4B29',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  overflowButton: {
    padding: 4,
  },
  addressDetailsText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#444444',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 6,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E4B29',
    fontFamily: ServenticaTokens.fonts.Medium,
  },

  // Search Results Mode
  searchResultsSection: {
    marginTop: 4,
  },
  searchingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  searchingText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 8,
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECECE8',
  },
  searchResultIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchResultTextBox: {
    flex: 1,
    marginRight: 8,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 2,
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: '#777777',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  emptySearchState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 4,
  },
  emptySearchSubtitle: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
  },
  emptySavedState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptySavedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  emptySavedSubtitle: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },

  // Add Address Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalFormScroll: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 6,
    marginTop: 10,
  },
  labelSelectorRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  labelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F4F2',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E8E6',
  },
  labelChipActive: {
    backgroundColor: '#1E4B29',
    borderColor: '#1E4B29',
  },
  labelChipText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  labelChipTextActive: {
    color: '#FFFFFF',
  },
  formInput: {
    backgroundColor: '#FBFBFA',
    borderWidth: 1,
    borderColor: '#E6E6E4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  formRow: {
    flexDirection: 'row',
  },
  saveSubmitBtn: {
    backgroundColor: '#1E4B29',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveSubmitBtnDisabled: {
    opacity: 0.7,
  },
  saveSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Medium,
  },

  // Options Sheet
  optionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 'auto',
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
  },
  optionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0EE',
  },
  optionActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginLeft: 12,
  },

  // Confirm Dialog
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 20,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  confirmCancelText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  confirmDeleteBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmDeleteText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
  },

  // Unserviceable Dialog
  unserviceableDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  unserviceableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E242B',
    textAlign: 'center',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    marginBottom: 8,
  },
  unserviceableMessage: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 20,
  },
  unserviceableBtn: {
    backgroundColor: '#1E4B29',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  unserviceableBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  pickOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  pickOnMapText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E4B29',
  },
});
