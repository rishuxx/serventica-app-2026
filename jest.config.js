module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-url-polyfill|@react-native-async-storage|lucide-react-native|react-native-svg|@expo-google-fonts|expo-font|expo)/)',
  ],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '\\.(png|jpg|jpeg|webp|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^@serventica/types$': '<rootDir>/packages/types/src',
    '^@serventica/validation$': '<rootDir>/packages/validation/src',
    '^@serventica/config$': '<rootDir>/packages/config/src',
    '^@serventica/design-system$': '<rootDir>/packages/design-system/src',
    '^@serventica/api-client$': '<rootDir>/packages/api-client/src',
    '^@serventica/analytics$': '<rootDir>/packages/analytics/src',
    '^@serventica/utils$': '<rootDir>/packages/utils/src',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
