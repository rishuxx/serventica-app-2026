/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../apps/customer/src/services/location.service', () => ({
  locationService: {
    getCurrentLocation: jest.fn().mockResolvedValue({
      id: 'mock_loc',
      title: 'Current Location',
      shortAddress: 'Civil Lines, Prayagraj',
      formattedAddress: 'Civil Lines, Prayagraj, UP',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      latitude: 25.4358,
      longitude: 81.8463,
      isServiceable: true,
      source: 'GPS',
    }),
    checkServiceability: jest.fn().mockResolvedValue({
      isServiceable: true,
      zoneId: 'z1',
      zoneName: 'Prayagraj Central',
      supportedCategories: [],
    }),
  },
}));

jest.mock('../apps/customer/src/services/auth.service', () => ({
  authService: {
    getSession: jest.fn().mockResolvedValue(null),
    getUser: jest.fn().mockResolvedValue(null),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});

