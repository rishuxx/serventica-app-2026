"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupabaseAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let SupabaseAuthGuard = SupabaseAuthGuard_1 = class SupabaseAuthGuard {
    constructor() {
        this.logger = new common_1.Logger(SupabaseAuthGuard_1.name);
        this.verificationCache = new Map();
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
        if (!url || !key) {
            this.logger.warn('Supabase URL or Key not configured — auth guard will reject all requests');
        }
        this.supabase = (0, supabase_js_1.createClient)(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid Authorization header');
        }
        const token = authHeader.split(' ')[1];
        if (!token || token.length < 20) {
            throw new common_1.UnauthorizedException('Authentication token required');
        }
        const cached = this.verificationCache.get(token);
        if (cached && cached.expiresAt > Date.now()) {
            request.user = cached.user;
            return true;
        }
        try {
            const { data, error } = await this.supabase.auth.getUser(token);
            if (error || !data?.user) {
                this.logger.warn(`Auth verification failed: ${error?.message || 'No user returned'}`);
                throw new common_1.UnauthorizedException('Invalid or expired authentication token');
            }
            const authenticatedUser = {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role || 'authenticated',
            };
            this.cacheVerification(token, authenticatedUser);
            request.user = authenticatedUser;
            return true;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException)
                throw err;
            this.logger.error(`Auth guard error: ${err.message}`);
            throw new common_1.UnauthorizedException('Authentication service unavailable');
        }
    }
    cacheVerification(token, user) {
        if (this.verificationCache.size >= SupabaseAuthGuard_1.CACHE_MAX_SIZE) {
            const firstKey = this.verificationCache.keys().next().value;
            if (firstKey)
                this.verificationCache.delete(firstKey);
        }
        this.verificationCache.set(token, {
            user,
            expiresAt: Date.now() + SupabaseAuthGuard_1.CACHE_TTL_MS,
        });
    }
};
exports.SupabaseAuthGuard = SupabaseAuthGuard;
SupabaseAuthGuard.CACHE_TTL_MS = 5 * 60 * 1000;
SupabaseAuthGuard.CACHE_MAX_SIZE = 500;
exports.SupabaseAuthGuard = SupabaseAuthGuard = SupabaseAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseAuthGuard);
//# sourceMappingURL=supabase-auth.guard.js.map