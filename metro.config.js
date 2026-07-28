const path = require('path')
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

const fontAwareReactNative = path.resolve(__dirname, 'src/lib/react-native-with-fonts.tsx')
// Metro's package-exports resolution picks tslib/modules/index.js, which does
// `import tslib from '../tslib.js'` and destructures tslib.default — undefined
// under Metro/CJS interop. Force the ESM build Moti (and others) expect.
const tslibEs6 = require.resolve('tslib/tslib.es6.js')
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

  if (moduleName === 'tslib') {
    return {
      type: 'sourceFile',
      filePath: tslibEs6,
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config