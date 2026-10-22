const path = require('path')
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

const fontAwareReactNative = path.resolve(__dirname, 'src/lib/react-native-with-fonts.tsx')
const appwritePackageSegment = `${path.sep}react-native-appwrite${path.sep}`
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

  // Appwrite still imports the legacy FileSystem API from the package root.
  // Keep one SDK 56 native module and route only Appwrite to the supported legacy entry.
  if (
    moduleName === 'expo-file-system' &&
    context.originModulePath.includes(appwritePackageSegment)
  ) {
    return context.resolveRequest(context, 'expo-file-system/legacy', platform)
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
