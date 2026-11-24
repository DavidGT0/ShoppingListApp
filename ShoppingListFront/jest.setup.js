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

// מעבר צבעים (רכיב נייטיבי): View שמחזיק את כל ה-props, כדי שאפשר לבדוק את colors
jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockLinearGradient = props => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockLinearGradient,
    LinearGradient: MockLinearGradient,
  };
});

// משך מינימלי של ספינר הריענון: 0 בבדיקות (בלי המתנות אמיתיות ועדכונים מאוחרים).
// בדיקה שרוצה משך מינימלי קובעת אותו בעצמה עם setMinRefreshMs ומחזירה ל-0
require('./src/services/minDuration').setMinRefreshMs(0);
