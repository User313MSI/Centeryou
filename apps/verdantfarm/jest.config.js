module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.js$': 'babel-jest' },
  moduleNameMapper: { '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorage.js' },
};
