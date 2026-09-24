import { CanActivate, ExecutionContext } from '@nestjs/common';
export interface AuthenticatedUser {
    id: string;
    email?: string;
    phone?: string;
    role: string;
}
export declare class SupabaseAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
