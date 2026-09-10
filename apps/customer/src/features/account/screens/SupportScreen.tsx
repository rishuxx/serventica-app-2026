import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, CheckCircle2, MessageSquare, Headphones } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useAuth } from '../../../context/AuthContext';
import { accountRepository } from '../../../repositories/account.repository';

interface SupportScreenProps {
  initialBookingId?: string | null;
  onBack: () => void;
}

const ISSUE_CATEGORIES = [
  'Booking Reschedule or Cancellation',
  'Service Quality & Workmanship',
  'Professional Behavior or Delay',
  'Payment, Billing & Invoicing',
  'General Query & Platform Help',
];

export const SupportScreen: React.FC<SupportScreenProps> = ({
  initialBookingId = null,
  onBack,
}) => {
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(ISSUE_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Details Required', 'Please describe your query or issue.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Account Required', 'Please log in to submit a support ticket.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await accountRepository.createSupportTicket({
        userId: user.id,
        bookingId: initialBookingId,
        category: selectedCategory,
        subject: subject.trim() || selectedCategory,
        description: description.trim(),
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        Alert.alert('Submission Failed', res.error || 'Please try again later.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.circleBackButton} onPress={onBack}>
            <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.submittedBox}>
          <View style={styles.submittedIconCircle}>
            <CheckCircle2 size={40} color="#059669" strokeWidth={2} />
          </View>
          <Text style={styles.submittedTitle}>Support Ticket Created</Text>
          <Text style={styles.submittedSubtitle}>
            Our operations team has received your query. A resolution specialist will review your request and contact you within 30 minutes.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Back to Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.circleBackButton} onPress={onBack}>
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* PROMISE STRIP */}
        <View style={styles.promiseBanner}>
          <Headphones size={20} color="#059669" strokeWidth={2} />
          <View style={styles.promiseContent}>
            <Text style={styles.promiseTitle}>Serventica Priority Care</Text>
            <Text style={styles.promiseSub}>
              Direct in-app resolution for ongoing and completed home services.
            </Text>
          </View>
        </View>

        {initialBookingId ? (
          <View style={styles.contextBadge}>
            <MessageSquare size={14} color='#1E242B' strokeWidth={2} />
            <Text style={styles.contextText}>Attached Booking: {initialBookingId.slice(0, 8)}</Text>
          </View>
        ) : null}

        {/* ISSUE CATEGORY */}
        <Text style={styles.sectionLabel}>Select Issue Type</Text>
        <View style={styles.categoriesPills}>
          {ISSUE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SUBJECT */}
        <Text style={styles.sectionLabel}>Subject (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief summary of your query"
          placeholderTextColor="#888888"
          value={subject}
          onChangeText={setSubject}
        />

        {/* DESCRIPTION */}
        <Text style={styles.sectionLabel}>Detailed Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Explain what happened or how our operations team can assist you..."
          placeholderTextColor="#888888"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Support Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0ED',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  headerSpacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  promiseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  promiseContent: {
    flex: 1,
  },
  promiseTitle: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#059669',
    marginBottom: 2,
  },
  promiseSub: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#047857',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  contextText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#333333',
  },
  sectionLabel: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#444444',
    marginBottom: 8,
    marginTop: 6,
  },
  categoriesPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillSelected: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  pillText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#555555',
  },
  pillTextSelected: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    paddingHorizontal: 14,
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#1E242B',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    padding: 14,
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#1E242B',
    marginBottom: 24,
  },
  submitBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E242B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  submittedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  submittedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  submittedTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 8,
    textAlign: 'center',
  },
  submittedSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  doneBtn: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1E242B',
  },
  doneBtnText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
  },
});
