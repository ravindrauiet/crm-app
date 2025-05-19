const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1) Allow Metro to load .cjs source files:
config.resolver.sourceExts.push('cjs');
// 2) (Optional) If you treat .cjs as assets, include it here too:
config.resolver.assetExts.push('cjs');

// Optimize Metro for large projects
module.exports = {
  ...config,
  maxWorkers: 4, // Limit parallel workers
  transformer: {
    ...config.transformer,
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      // Terser options
      compress: {
        drop_console: true,
        reduce_funcs: false, // Helps with stack overflow issues
      },
    },
  },
  resolver: {
    ...config.resolver,
    extraNodeModules: {},
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs'],
    assetExts: [...config.resolver.assetExts, 'cjs'],
  },
  serializer: {
    ...config.serializer,
    // createModuleIdFactory: require('react-native/packager/src/lib/createModuleIdFactory'),
  },
  cacheStores: [],
  resetCache: true, // Force reset cache on each build
}; 