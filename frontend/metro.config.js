const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Defer module requires until used — faster startup after first bundle.
config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = config;
