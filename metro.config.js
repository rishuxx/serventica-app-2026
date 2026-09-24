const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const baseConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    blockList: [
      new RegExp(`^${path.resolve(__dirname, 'android').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`),
      new RegExp(`^${path.resolve(__dirname, 'ios').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`),
      new RegExp(`^${path.resolve(__dirname, 'apps/customer/node_modules').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`),
    ],
    assetExts: [...baseConfig.resolver.assetExts, 'ttf', 'otf', 'png', 'jpg'],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
    extraNodeModules: new Proxy({}, {
      get: (target, name) => {
        if (typeof name !== 'string') return undefined;
        // Workspace aliases
        if (name === 'ws') return path.resolve(__dirname, 'src/shims/ws.js');
        if (name === 'socket.io-client') return path.resolve(__dirname, 'node_modules/socket.io-client/dist/socket.io.js');
        if (name === 'engine.io-client') return path.resolve(__dirname, 'node_modules/engine.io-client/build/cjs/index.js');
        if (name === '@serventica/design-system') return path.resolve(__dirname, 'packages/design-system/src');
        if (name === '@serventica/types') return path.resolve(__dirname, 'packages/types/src');
        if (name === '@serventica/config') return path.resolve(__dirname, 'packages/config/src');
        if (name === '@serventica/validation') return path.resolve(__dirname, 'packages/validation/src');
        if (name === '@serventica/api-client') return path.resolve(__dirname, 'packages/api-client/src');
        if (name === '@serventica/analytics') return path.resolve(__dirname, 'packages/analytics/src');
        if (name === '@serventica/utils') return path.resolve(__dirname, 'packages/utils/src');
        
        // Resolve from root node_modules
        return path.resolve(__dirname, 'node_modules', name);
      }
    }),
  },
};

module.exports = mergeConfig(baseConfig, config);

