module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-mmkv|react-native-nitro-modules|react-native-saf-x|@react-native-documents|react-native-receive-sharing-intent|@dr.pogodin)/)',
  ],
};
