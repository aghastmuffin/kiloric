module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.KILORIC_BASE_PATH ? { baseUrl: process.env.KILORIC_BASE_PATH } : {}),
  },
})
