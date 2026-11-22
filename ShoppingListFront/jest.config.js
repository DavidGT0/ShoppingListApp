module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // react-native-worklets (של Reanimated) - טוען את גרסת ה-JS במקום הנייטיבית
  resolver: 'react-native-worklets/jest/resolver',
  // ספריות שמגיעות כקוד ESM צריכות לעבור דרך Babel גם בתוך node_modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-.*)/)',
  ],
};
