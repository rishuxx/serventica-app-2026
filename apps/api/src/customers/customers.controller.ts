import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CustomerBootstrapResponse } from '@serventica/types';

@Controller('customers')
export class CustomersController {
  @Get('bootstrap')
  @UseGuards(SupabaseAuthGuard)
  async getBootstrap(@Req() req: any): Promise<CustomerBootstrapResponse> {
    const userId = req.user?.id || 'usr_bootstrap_fallback';

    return {
      user: {
        id: userId,
        email: 'customer@serventica.in',
        phone: '+919876543210',
        display_name: 'Serventica Verified Customer',
        avatar_url: null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      profile: {
        id: 'prof_' + userId,
        user_id: userId,
        first_name: 'Verified',
        last_name: 'Customer',
        avatar_url: null,
        preferred_language: 'en',
        onboarding_status: 'NEW',
        default_address_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      roles: ['CUSTOMER'],
      onboarding_status: 'NEW',
    };
  }
}
