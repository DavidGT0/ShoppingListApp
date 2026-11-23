/* global jest */
// מוקים למודולים נייטיביים, כדי שאפשר יהיה להריץ את הקוד ב-Jest (ללא מכשיר)
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// אייקוני וקטור: מוק שמציג רכיב 'Icon' עם ה-props (name וכו') כדי שאפשר לבדוק אותם
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
