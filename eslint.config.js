const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  {
    ignores: ["**/dist/**/*", "**/src/dep/**/*"],
  },
  ...expoConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react/no-unescaped-entities": "off",
    }
  }
];
