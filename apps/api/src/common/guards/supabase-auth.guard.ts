import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * SERVENTICA — Production Supabase JWT Auth Guard
 *
 * Verifies every inbound request against Supabase Auth by calling auth.getUser(token).
 * This is the ONLY secure approach — never trust client-decoded JWTs.
 *
 * Caching: We cache verified user IDs in a Map with a 5-minute TTL to avoid
 * hitting Supabase Auth on every single request from the same session.
 */

export interface AuthenticatedUser {
  id: string;
  email?: string;
  phone?: string;
  role: string;
}

interface CachedVerification {
  user: AuthenticatedUser;
  expiresAt: number;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly supabase: SupabaseClient;

  // In-memory JWT verification cache (5 min TTL, max 500 entries)
  private readonly verificationCache: Map<string, CachedVerification> = new Map();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly CACHE_MAX_SIZE = 500;

  constructor() {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!url || !key) {
      this.logger.warn('Supabase URL or Key not configured — auth guard will reject all requests');
    }

    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.length < 20) {
      throw new UnauthorizedException('Authentication token required');
    }

    // Check verification cache first (avoids hammering Supabase Auth)
    const cached = this.verificationCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      (request as any).user = cached.user;
      return true;
    }

    // Verify token against Supabase Auth (server-side, authoritative)
    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data?.user) {
        this.logger.warn(`Auth verification failed: ${error?.message || 'No user returned'}`);
        throw new UnauthorizedException('Invalid or expired authentication token');
      }

      const authenticatedUser: AuthenticatedUser = {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role || 'authenticated',
      };

      // Cache the verification result
      this.cacheVerification(token, authenticatedUser);

      (request as any).user = authenticatedUser;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`Auth guard error: ${err.message}`);
      throw new UnauthorizedException('Authentication service unavailable');
    }
  }

  private cacheVerification(token: string, user: AuthenticatedUser): void {
    // Evict oldest entries if cache is full
    if (this.verificationCache.size >= SupabaseAuthGuard.CACHE_MAX_SIZE) {
      const firstKey = this.verificationCache.keys().next().value;
      if (firstKey) this.verificationCache.delete(firstKey);
    }

    this.verificationCache.set(token, {
      user,
      expiresAt: Date.now() + SupabaseAuthGuard.CACHE_TTL_MS,
    });
  }
}
