import { CanActivate, ExecutionContext } from '@nestjs/common';
export interface AuthenticatedUser {
    id: string;
    email?: string;
    phone?: string;
    role: string;
}
export declare class SupabaseAuthGuard implements CanActivate {
    private readonly logger;
    private readonly supabase;
    private readonly verificationCache;
    private static readonly CACHE_TTL_MS;
    private static readonly CACHE_MAX_SIZE;
    constructor();
    canActivate(context: ExecutionContext): Promise<boolean>;
    private cacheVerification;
}
