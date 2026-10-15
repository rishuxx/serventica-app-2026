import { Injectable, BadRequestException } from '@nestjs/common';
import { InstantServiceType } from '@serventica/types';
import { InstantServicePolicyDefinition } from './service-policy.interface';
import { HelpingHandPolicy } from './helping-hand-policy';
import { RoadHelpPolicy } from './road-help-policy';
import { LaundryPolicy } from './laundry-policy';
import { PackMovePolicy } from './pack-move-policy';

@Injectable()
export class ServicePolicyFactory {
  private readonly policies: Map<string, InstantServicePolicyDefinition> = new Map();

  constructor() {
    const hh = new HelpingHandPolicy();
    const rh = new RoadHelpPolicy();
    const lnd = new LaundryPolicy();
    const pm = new PackMovePolicy();

    this.policies.set('HELPING_HAND', hh);
    this.policies.set('helping-hand', hh);
    this.policies.set('ROAD_HELP', rh);
    this.policies.set('road-help', rh);
    this.policies.set('LAUNDRY', lnd);
    this.policies.set('laundry', lnd);
    this.policies.set('PACK_MOVE', pm);
    this.policies.set('pack-move', pm);
  }

  getPolicy(serviceTypeOrSlug: string): InstantServicePolicyDefinition {
    const policy = this.policies.get(serviceTypeOrSlug);
    if (!policy) {
      throw new BadRequestException(
        `Unsupported instant service: ${serviceTypeOrSlug}. Supported: helping-hand, road-help, laundry, pack-move`
      );
    }
    return policy;
  }

  getAllPolicies(): InstantServicePolicyDefinition[] {
    return [
      this.policies.get('HELPING_HAND')!,
      this.policies.get('ROAD_HELP')!,
      this.policies.get('LAUNDRY')!,
      this.policies.get('PACK_MOVE')!,
    ];
  }
}
