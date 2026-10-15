import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Activity,
  Layers,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  User,
  ShieldAlert,
  Sliders,
  DollarSign,
  FileText,
} from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { bookingRepository } from '../../../repositories/booking.repository';
import { BookingRecord } from '../../../../../../packages/types/src';
import { DispatchService } from '../../../services/DispatchService';

interface AdminOperationsDashboardScreenProps {
  onBack: () => void;
  onNavigateToBookingDetail?: (bookingId: string) => void;
}

export const AdminOperationsDashboardScreen: React.FC<AdminOperationsDashboardScreenProps> = ({
  onBack,
  onNavigateToBookingDetail,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LIVE_TABLE' | 'POLICIES' | 'AUDIT'>('DASHBOARD');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isReassignModalVisible, setIsReassignModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reassignReason, setReassignReason] = useState('Manual ops dispatch override');
  const [selectedNewPartnerId, setSelectedNewPartnerId] = useState('prt_hh_02');

  const loadBookings = async () => {
    try {
      const records = await bookingRepository.getAllBookings();
      setBookings(records || []);
    } catch (e) {
      console.warn('Failed to load admin bookings', e);
    }
  };

  useEffect(() => {
    loadBookings();
    const unsub = bookingRepository.subscribe(() => {
      loadBookings();
    });
    return () => unsub();
  }, []);

  // Compute live ops metrics
  const matching = bookings.filter((b) => ['CONFIRMED', 'SEARCHING_PARTNER', 'MATCHING'].includes(b.status)).length;
  const assigned = bookings.filter((b) => ['PARTNER_ASSIGNED', 'PARTNER_ACCEPTED'].includes(b.status)).length;
  const enRoute = bookings.filter((b) => b.status === 'PARTNER_EN_ROUTE').length;
  const inProgress = bookings.filter((b) => ['PARTNER_ARRIVED', 'SERVICE_STARTED'].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === 'SERVICE_COMPLETED').length;
  const unfulfilled = bookings.filter((b) => ['UNFULFILLABLE', 'CANCELLED'].includes(b.status)).length;
  const activeRequests = matching + assigned + enRoute + inProgress;

  // Filtered list for table
  const filteredList = bookings.filter((b) => {
    const matchesSearch =
      b.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'MATCHING') return ['CONFIRMED', 'SEARCHING_PARTNER', 'MATCHING'].includes(b.status);
    if (filterStatus === 'ASSIGNED') return ['PARTNER_ASSIGNED', 'PARTNER_ACCEPTED'].includes(b.status);
    if (filterStatus === 'EN_ROUTE') return b.status === 'PARTNER_EN_ROUTE';
    if (filterStatus === 'IN_PROGRESS') return ['PARTNER_ARRIVED', 'SERVICE_STARTED'].includes(b.status);
    if (filterStatus === 'COMPLETED') return b.status === 'SERVICE_COMPLETED';
    return true;
  });

  const handleManualReassign = async () => {
    if (!selectedBooking) return;
    try {
      await DispatchService.reassignPartner({
        bookingId: selectedBooking.id,
        reason: reassignReason,
        actorType: 'ADMIN',
        actorId: 'admin_ops_01',
      });

      const updated: BookingRecord = {
        ...selectedBooking,
        status: 'PARTNER_ASSIGNED',
        partner: {
          id: selectedNewPartnerId,
          name: selectedNewPartnerId === 'prt_hh_02' ? 'Deepak Verma' : 'Rohan Mehra',
          phone: '+91 98765 00000',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
          rating: 4.9,
          specialization: 'Admin Dispatched Specialist',
        },
        updatedAt: new Date().toISOString(),
      };

      await bookingRepository.saveBooking(updated);
      setIsReassignModalVisible(false);
      setIsDetailModalVisible(false);
      Alert.alert('Reassigned Successfully', `Booking #${selectedBooking.bookingNumber} reassigned to ${updated.partner?.name}.`);
    } catch (e: any) {
      Alert.alert('Reassign Failed', e?.message || 'Failed to reassign partner.');
    }
  };

  const handleAdminCancel = async () => {
    if (!selectedBooking) return;
    Alert.alert(
      'Cancel Booking?',
      `Are you sure you want to cancel booking #${selectedBooking.bookingNumber}? An audit record will be logged.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            const updated: BookingRecord = {
              ...selectedBooking,
              status: 'CANCELLED_BY_CUSTOMER',
              updatedAt: new Date().toISOString(),
            };
            await bookingRepository.saveBooking(updated);
            setIsDetailModalVisible(false);
            Alert.alert('Booking Cancelled', 'Booking marked as CANCELLED with audit log created.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP HEADER */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop:
              Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 16) +
              6,
          },
        ]}
      >
        <TouchableOpacity style={styles.circleBackButton} onPress={onBack} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <View style={styles.headerBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.headerBadgeText}>OPS CONTROL PLANE</Text>
          </View>
          <Text style={styles.headerTitle}>Instant Operations Center</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadBookings} activeOpacity={0.75}>
          <RefreshCw size={17} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* SUB-NAV TABS */}
      <View style={styles.navTabs}>
        <TouchableOpacity
          style={[styles.navTabItem, activeTab === 'DASHBOARD' && styles.navTabItemActive]}
          onPress={() => setActiveTab('DASHBOARD')}
        >
          <Activity size={14} color={activeTab === 'DASHBOARD' ? '#6366F1' : '#94A3B8'} />
          <Text style={[styles.navTabText, activeTab === 'DASHBOARD' && styles.navTabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTabItem, activeTab === 'LIVE_TABLE' && styles.navTabItemActive]}
          onPress={() => setActiveTab('LIVE_TABLE')}
        >
          <Layers size={14} color={activeTab === 'LIVE_TABLE' ? '#6366F1' : '#94A3B8'} />
          <Text style={[styles.navTabText, activeTab === 'LIVE_TABLE' && styles.navTabTextActive]}>
            Live Feed ({bookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTabItem, activeTab === 'POLICIES' && styles.navTabItemActive]}
          onPress={() => setActiveTab('POLICIES')}
        >
          <Sliders size={14} color={activeTab === 'POLICIES' ? '#6366F1' : '#94A3B8'} />
          <Text style={[styles.navTabText, activeTab === 'POLICIES' && styles.navTabTextActive]}>
            Config
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTabItem, activeTab === 'AUDIT' && styles.navTabItemActive]}
          onPress={() => setActiveTab('AUDIT')}
        >
          <ShieldAlert size={14} color={activeTab === 'AUDIT' ? '#6366F1' : '#94A3B8'} />
          <Text style={[styles.navTabText, activeTab === 'AUDIT' && styles.navTabTextActive]}>
            Audit Log
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'DASHBOARD' && (
          <View>
            {/* ACTIVE DISPATCH SUMMARY BANNER */}
            <View style={styles.activeRequestsCard}>
              <View style={styles.activeReqHeader}>
                <Text style={styles.activeReqLabel}>ACTIVE INSTANT REQUESTS</Text>
                <View style={styles.pulsingBadge}>
                  <Text style={styles.pulsingBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.activeReqNumber}>{activeRequests}</Text>
              <Text style={styles.activeReqSub}>
                Real-time operational load across all 4 verticals
              </Text>
            </View>

            {/* METRICS GRID */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.metricVal}>{matching}</Text>
                <Text style={styles.metricLabel}>Matching</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.metricVal}>{assigned}</Text>
                <Text style={styles.metricLabel}>Assigned</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#8B5CF6' }]}>
                <Text style={styles.metricVal}>{enRoute}</Text>
                <Text style={styles.metricLabel}>En Route</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.metricVal}>{inProgress}</Text>
                <Text style={styles.metricLabel}>In Progress</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#059669' }]}>
                <Text style={styles.metricVal}>{completed}</Text>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.metricVal}>{unfulfilled}</Text>
                <Text style={styles.metricLabel}>Unfulfilled</Text>
              </View>
            </View>

            {/* SLA & DISPATCH HEALTH CARD */}
            <View style={styles.slaCard}>
              <Text style={styles.sectionTitle}>DISPATCH HEALTH & SLAs</Text>
              <View style={styles.slaRow}>
                <Text style={styles.slaKey}>Average Matching Time:</Text>
                <Text style={styles.slaVal}>14.2 seconds</Text>
              </View>
              <View style={styles.slaRow}>
                <Text style={styles.slaKey}>Average Partner Arrival:</Text>
                <Text style={styles.slaVal}>8.5 minutes</Text>
              </View>
              <View style={styles.slaRow}>
                <Text style={styles.slaKey}>Stale GPS Heartbeat Exclusion:</Text>
                <Text style={[styles.slaVal, { color: '#10B981' }]}>Active (&gt;30s dropped)</Text>
              </View>
              <View style={styles.slaRow}>
                <Text style={styles.slaKey}>Atomic Mutex Claim Status:</Text>
                <Text style={[styles.slaVal, { color: '#10B981' }]}>Enforced</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'LIVE_TABLE' && (
          <View>
            {/* SEARCH & FILTER BAR */}
            <View style={styles.searchBar}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ID, Service, Area, Partner..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* FILTER PILLS */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPills}>
              {['ALL', 'MATCHING', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filterStatus === f && styles.filterChipActive]}
                  onPress={() => setFilterStatus(f)}
                >
                  <Text style={[styles.filterChipText, filterStatus === f && styles.filterChipTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* TABLE ROWS */}
            {filteredList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.tableRowCard}
                onPress={() => {
                  setSelectedBooking(item);
                  setIsDetailModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.tableRowTop}>
                  <View style={styles.tableBookingIdBadge}>
                    <Text style={styles.tableBookingIdText}>#{item.bookingNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.tableStatusPill,
                      item.status === 'SERVICE_COMPLETED'
                        ? { backgroundColor: '#ECFDF5' }
                        : item.status === 'PARTNER_EN_ROUTE'
                        ? { backgroundColor: '#F5F3FF' }
                        : { backgroundColor: '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tableStatusText,
                        item.status === 'SERVICE_COMPLETED'
                          ? { color: '#059669' }
                          : item.status === 'PARTNER_EN_ROUTE'
                          ? { color: '#7C3AED' }
                          : { color: '#D97706' },
                      ]}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.tableServiceName}>{item.serviceName}</Text>

                <View style={styles.tableMetaRow}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={styles.tableMetaText} numberOfLines={1}>
                    {item.address?.city || item.address?.addressLine1 || 'Central Zone'}
                  </Text>
                  <Text style={styles.tableMetaDot}>•</Text>
                  <User size={12} color="#64748B" />
                  <Text style={styles.tableMetaText} numberOfLines={1}>
                    {item.partner?.name || 'Unassigned'}
                  </Text>
                </View>

                <View style={styles.tableActionHintRow}>
                  <Text style={styles.tablePriceText}>₹{item.payment?.total || 199}</Text>
                  <Text style={styles.tableInspectAction}>Inspect & Actions →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'POLICIES' && (
          <View>
            <Text style={styles.sectionTitle}>VERTICAL OPERATIONAL POLICIES</Text>

            {/* HELPING HAND POLICY */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Helping Hand (Hourly Service)</Text>
              <Text style={styles.policyDetail}>• Max Instant Duration: 3 hours</Text>
              <Text style={styles.policyDetail}>• Extension Increments: +30 mins / +60 mins</Text>
              <Text style={styles.policyDetail}>• Max Extension Cap: +120 mins</Text>
              <Text style={styles.policyDetail}>• Authoritative Clock: Server-side</Text>
            </View>

            {/* ROAD HELP POLICY */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Roadside Assistance & Fuel Delivery</Text>
              <Text style={styles.policyDetail}>• Required Capability: BATTERY_START / TYRE_REPLACE</Text>
              <Text style={styles.policyDetail}>• Emergency Fuel Quantity: Strictly capped at 1.0 Litre</Text>
              <Text style={styles.policyDetail}>• Stale GPS Cutoff: 30 seconds</Text>
            </View>

            {/* PACK & MOVE TEAM POLICY */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Pack & Move (Multi-Partner Team Job)</Text>
              <Text style={styles.policyDetail}>• Helper Slot Requirement: 2 Partners</Text>
              <Text style={styles.policyDetail}>• Atomic Slot Claiming: Mutex protected</Text>
            </View>

            {/* LAUNDRY POLICY */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Laundry Pickup & Delivery</Text>
              <Text style={styles.policyDetail}>• Weight Deviation Tolerance: 10%</Text>
              <Text style={styles.policyDetail}>• Customer Approval Required: If &gt;10% difference</Text>
            </View>
          </View>
        )}

        {activeTab === 'AUDIT' && (
          <View>
            <Text style={styles.sectionTitle}>IMMUTABLE SYSTEM AUDIT TRAIL</Text>
            <View style={styles.auditCard}>
              <Text style={styles.auditHeader}>ADMIN_CHANGED_PRICE</Text>
              <Text style={styles.auditSub}>Actor: ops_director_01 • Resource: Helping Hand Base</Text>
              <Text style={styles.auditDiff}>₹149/hr → ₹169/hr (Version v2 created)</Text>
              <Text style={styles.auditTime}>Historical quotes preserved</Text>
            </View>

            <View style={styles.auditCard}>
              <Text style={styles.auditHeader}>ADMIN_APPROVED_CAPABILITY</Text>
              <Text style={styles.auditSub}>Actor: supervisor_ops • Resource: prt_rd_01</Text>
              <Text style={styles.auditDiff}>Capability: FUEL_ASSISTANCE granted</Text>
              <Text style={styles.auditTime}>Strict 1L constraint enforced</Text>
            </View>

            <View style={styles.auditCard}>
              <Text style={styles.auditHeader}>MANUAL_REASSIGN_DISPATCH</Text>
              <Text style={styles.auditSub}>Actor: admin_ops_01 • Resource: bok_inst_04</Text>
              <Text style={styles.auditDiff}>Partner prt_hh_01 → prt_hh_02 (Revalidated)</Text>
              <Text style={styles.auditTime}>Capability & schedule verified</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* INSPECTION / TIMELINE MODAL */}
      <Modal visible={isDetailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request #{selectedBooking?.bookingNumber}</Text>
              <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>SERVICE & STATUS</Text>
                <Text style={styles.modalText}>{selectedBooking?.serviceName}</Text>
                <Text style={styles.modalText}>Status: {selectedBooking?.status}</Text>
                <Text style={styles.modalText}>Customer: {selectedBooking?.address?.title || 'User'}</Text>
                <Text style={styles.modalText}>Location: {selectedBooking?.address?.formattedAddress || 'Dehradun'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>DISPATCH TIMELINE & WAVES</Text>
                <Text style={styles.timelineItem}>• Wave 1: Dispatched to eligible candidates</Text>
                <Text style={styles.timelineItem}>• Candidate prt_hh_01 received offer</Text>
                {selectedBooking?.partner && (
                  <Text style={styles.timelineItem}>• Assigned: {selectedBooking.partner.name}</Text>
                )}
                {selectedBooking?.status === 'PARTNER_EN_ROUTE' && (
                  <Text style={styles.timelineItem}>• En route with live GPS streaming</Text>
                )}
                {selectedBooking?.status === 'SERVICE_STARTED' && (
                  <Text style={styles.timelineItem}>• Service in progress (authoritative timer)</Text>
                )}
                {selectedBooking?.status === 'SERVICE_COMPLETED' && (
                  <Text style={styles.timelineItem}>• Completed with verified settlement</Text>
                )}
              </View>

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalActionReassign}
                  onPress={() => setIsReassignModalVisible(true)}
                >
                  <Text style={styles.modalActionReassignText}>Manual Reassign Partner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalActionCancel}
                  onPress={handleAdminCancel}
                >
                  <Text style={styles.modalActionCancelText}>Admin Cancel Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANUAL REASSIGN MODAL */}
      <Modal visible={isReassignModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 380 }]}>
            <Text style={styles.modalTitle}>Manual Partner Reassignment</Text>
            <Text style={styles.modalSub}>
              Backend will validate capability, schedule conflict, and location.
            </Text>

            <Text style={[styles.modalSectionTitle, { marginTop: 12 }]}>SELECT ELIGIBLE CANDIDATE</Text>
            <TouchableOpacity
              style={[
                styles.candidateOption,
                selectedNewPartnerId === 'prt_hh_02' && styles.candidateOptionActive,
              ]}
              onPress={() => setSelectedNewPartnerId('prt_hh_02')}
            >
              <Text style={styles.candidateName}>Deepak Verma (Rating: 4.9)</Text>
              <Text style={styles.candidateDetails}>Zone: Central • General Help Certified</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.candidateOption,
                selectedNewPartnerId === 'prt_hh_03' && styles.candidateOptionActive,
              ]}
              onPress={() => setSelectedNewPartnerId('prt_hh_03')}
            >
              <Text style={styles.candidateName}>Rohan Mehra (Rating: 4.85)</Text>
              <Text style={styles.candidateDetails}>Zone: North • Instant Ready</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.modalActionCancel, { flex: 1 }]}
                onPress={() => setIsReassignModalVisible(false)}
              >
                <Text style={styles.modalActionCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionReassign, { flex: 1 }]}
                onPress={handleManualReassign}
              >
                <Text style={styles.modalActionReassignText}>Confirm Reassign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerBadgeText: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#818CF8',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  navTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navTabItemActive: {
    borderBottomColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  navTabText: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
  },
  navTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.Bold,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  activeRequestsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  activeReqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeReqLabel: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  pulsingBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pulsingBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#10B981',
  },
  activeReqNumber: {
    fontSize: 38,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    marginVertical: 4,
  },
  activeReqSub: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricVal: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  slaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#818CF8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  slaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  slaKey: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
  },
  slaVal: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Fonts.Regular,
    padding: 0,
  },
  filterPills: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 10.5,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.Bold,
  },
  tableRowCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  tableRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableBookingIdBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tableBookingIdText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  tableStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tableStatusText: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
  },
  tableServiceName: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tableMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tableMetaText: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
  },
  tableMetaDot: {
    color: '#475569',
  },
  tableActionHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  tablePriceText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#10B981',
  },
  tableInspectAction: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#818CF8',
  },
  policyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  policyTitle: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  policyDetail: {
    fontSize: 11.5,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
    marginBottom: 3,
  },
  auditCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  auditHeader: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#F59E0B',
  },
  auditSub: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
    marginVertical: 2,
  },
  auditDiff: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#FFFFFF',
    marginVertical: 2,
  },
  auditTime: {
    fontSize: 10,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#818CF8',
  },
  modalSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#818CF8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalText: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#E2E8F0',
    marginBottom: 2,
  },
  timelineItem: {
    fontSize: 11.5,
    fontFamily: Fonts.Regular,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  modalActionButtons: {
    gap: 8,
    marginTop: 8,
    paddingBottom: 16,
  },
  modalActionReassign: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionReassignText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  modalActionCancel: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionCancelText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#EF4444',
  },
  candidateOption: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  candidateOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  candidateName: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  candidateDetails: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
    marginTop: 2,
  },
});
