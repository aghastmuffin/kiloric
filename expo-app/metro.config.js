const path = require('path')
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

const fontAwareReactNative = path.resolve(__dirname, 'src/lib/react-native-with-fonts.tsx')
const originalResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only redirect the root `react-native` entry — not deep imports like
  // `react-native/Libraries/...` used by Expo and other node_modules.
  if (moduleName === 'react-native') {
    return {
      type: 'sourceFile',
      filePath: fontAwareReactNative,
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
