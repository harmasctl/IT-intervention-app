const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Disable cache to prevent "Unable to deserialize cloned data" errors
config.cacheStores = [];

// Additional cache settings to prevent serialization issues
config.resetCache = true;
config.transformer.enableBabelRCLookup = false;

module.exports = withNativeWind(config, {
  input: "./global.css",
});
