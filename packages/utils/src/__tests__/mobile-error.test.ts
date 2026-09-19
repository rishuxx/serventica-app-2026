import { MobileErrorTransformer } from '../mobile-error';

describe('Mobile Backend Patterns & Error Transformer', () => {
  it('should transform network failure into friendly actionable mobile error', () => {
    const rawError = new Error('Network request failed');
    const transformed = MobileErrorTransformer.transform(rawError);

    expect(transformed.code).toBe('NETWORK_UNAVAILABLE');
    expect(transformed.retry.allowed).toBe(true);
    expect(transformed.user_message).toContain('No internet connection');
    expect(transformed.action.type).toBe('retry');
  });

  it('should transform JWT/401 auth expiration into navigation login action', () => {
    const rawError = { message: 'JWT expired', status: 401 };
    const transformed = MobileErrorTransformer.transform(rawError);

    expect(transformed.code).toBe('AUTH_SESSION_EXPIRED');
    expect(transformed.retry.allowed).toBe(false);
    expect(transformed.action.type).toBe('navigate');
    expect(transformed.action.destination).toBe('LOGIN');
  });

  it('should transform unserviceable location into location picker action', () => {
    const rawError = new Error('Pincode is unserviceable at current partner capacity');
    const transformed = MobileErrorTransformer.transform(rawError);

    expect(transformed.code).toBe('LOCATION_UNSERVICEABLE');
    expect(transformed.action.destination).toBe('SELECT_LOCATION');
  });

  it('should execute operation with automatic retry on transient failure', async () => {
    let calls = 0;
    const transientOperation = async () => {
      calls++;
      if (calls < 2) {
        throw new Error('Transient network error');
      }
      return 'SUCCESS_DATA';
    };

    const result = await MobileErrorTransformer.executeWithRetry(transientOperation, 3, 10);
    expect(result).toBe('SUCCESS_DATA');
    expect(calls).toBe(2);
  });
});
