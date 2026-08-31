module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    // RN template smoke test pulls gesture-handler ESM; unit suite is the rest of __tests__/
    '<rootDir>/__tests__/App.test.tsx',
  ],
};
