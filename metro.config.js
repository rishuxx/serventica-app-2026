const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const path = require('path');

const config = {
  resolver: {
    blockList: [
      new RegExp(`^${path.resolve(__dirname, 'android').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`),
      new RegExp(`^${path.resolve(__dirname, 'ios').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`),
    ],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
    extraNodeModules: new Proxy(
      {
        ws: path.resolve(__dirname, 'src/shims/ws.js'),
        stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
        events: path.resolve(__dirname, 'node_modules/events'),
        '@serventica/design-system': path.resolve(__dirname, 'packages/design-system/src'),
        '@serventica/types': path.resolve(__dirname, 'packages/types/src'),
        '@serventica/config': path.resolve(__dirname, 'packages/config/src'),
        '@serventica/validation': path.resolve(__dirname, 'packages/validation/src'),
        '@serventica/api-client': path.resolve(__dirname, 'packages/api-client/src'),
        '@serventica/analytics': path.resolve(__dirname, 'packages/analytics/src'),
        '@serventica/utils': path.resolve(__dirname, 'packages/utils/src'),
      },
      {
        get: (target, name) => {
          if (name in target) {
            return target[name];
          }
          return path.join(__dirname, 'node_modules', name);
        },
      }
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
