const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Completely disable cache to prevent serialization issues
config.cacheStores = [];
config.resetCache = true;

// Additional settings to prevent cache-related errors
config.transformer.enableBabelRCLookup = false;
config.transformer.minifierConfig = { compress: { unused: true } };

// Disable caching for the transformer
config.transformer.asyncRequireModulePath = require.resolve(
  "metro-runtime/src/modules/asyncRequire",
);
config.transformer.useCreateModuleIdForHotModules = true;

// Increase max workers for better performance
config.maxWorkers = 4;

module.exports = withNativeWind(config, {
  input: "./global.css",
});
