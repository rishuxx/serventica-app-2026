import { PartnerLiveLocation } from '@serventica/types';
export interface LocationValidationResult {
    isValid: boolean;
    reason?: string;
    sanitizedLocation?: PartnerLiveLocation;
}
export declare class LocationValidationService {
    private readonly logger;
    private readonly MAX_SPEED_MPS;
    private readonly MAX_ACCURACY_METERS;
    private readonly MAX_STALENESS_MS;
    validatePartnerLocation(raw: Partial<PartnerLiveLocation>, lastKnown?: PartnerLiveLocation | null): LocationValidationResult;
    calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
    calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number;
}
