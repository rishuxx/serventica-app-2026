import { InstantServiceType, PartnerCapabilityCode } from '@serventica/types';

export interface PartnerCandidate {
  partnerId: string;
  userId: string;
  fullName: string;
  phone: string;
  isApproved: boolean;
  isActive: boolean;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  capabilities: PartnerCapabilityCode[];
  vehicleType?: 'BIKE' | 'SCOOTER' | 'CAR' | 'SUV' | 'TRUCK' | 'NONE';
  lastLatitude: number;
  lastLongitude: number;
  lastHeartbeatAt: string; // ISO date string
  currentActiveJobCount: number;
  completedJobCount: number;
  acceptanceRate: number; // 0.0 to 1.0
  rating: number; // 1.0 to 5.0
  hasConflictingFutureBooking: boolean;
}

export interface PartnerCandidateContext {
  serviceType: InstantServiceType;
  requiredCapability: PartnerCapabilityCode;
  customerLatitude: number;
  customerLongitude: number;
  maxRadiusKm: number;
  maxEtaMinutes: number;
  requiredVehicle?: string;
  durationMinutes: number;
  startTime?: string;
}
