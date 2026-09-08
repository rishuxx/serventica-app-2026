module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@serventica/design-system': './packages/design-system/src',
          '@serventica/types': './packages/types/src',
          '@serventica/config': './packages/config/src',
          '@serventica/validation': './packages/validation/src',
          '@serventica/api-client': './packages/api-client/src',
          '@serventica/analytics': './packages/analytics/src',
          '@serventica/utils': './packages/utils/src',
        },
      },
    ],
  ],
};
