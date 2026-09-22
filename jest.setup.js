/* eslint-disable no-undef */
jest.mock('react-native-url-polyfill/auto', () => {});

const mockAsyncStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(null),
  multiRemove: jest.fn().mockResolvedValue(null),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

jest.mock('@expo-google-fonts/lexend', () => ({
  useFonts: () => [true],
  Lexend_100Thin: 'Lexend_100Thin',
  Lexend_300Light: 'Lexend_300Light',
  Lexend_400Regular: 'Lexend_400Regular',
  Lexend_500Medium: 'Lexend_500Medium',
  Lexend_600SemiBold: 'Lexend_600SemiBold',
  Lexend_700Bold: 'Lexend_700Bold',
  Lexend_800ExtraBold: 'Lexend_800ExtraBold',
  Lexend_900Black: 'Lexend_900Black',
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true],
  loadAsync: jest.fn().mockResolvedValue(true),
  isLoaded: jest.fn().mockReturnValue(true),
}));
