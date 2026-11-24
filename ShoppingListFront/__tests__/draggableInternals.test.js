/* global test, expect */
// מצב ידני קורא את מיקום הגלילה מקובץ פנימי של react-native-draggable-flatlist
// (src/hooks/NestableOffsetObserver.js). אם הספרייה תשתנה, הבדיקה הזו נכשלת
// במקום שהריענון במשיכה יחזור בשקט להתנהגות השגויה
const fs = require('fs');
const path = require('path');

const lib = path.join(__dirname, '../node_modules/react-native-draggable-flatlist');

test('the draggable list library is pinned to the version the observer was written for', () => {
  const app = require('../package.json');
  expect(app.dependencies['react-native-draggable-flatlist']).toBe('4.0.3');
  expect(require(path.join(lib, 'package.json')).version).toBe('4.0.3');
});

test('the internal nestable context still exposes outerScrollOffset', () => {
  const src = fs.readFileSync(
    path.join(lib, 'src/context/nestableScrollContainerContext.tsx'),
    'utf8',
  );
  expect(src).toMatch(/export function useNestableScrollContainerContext/);
  expect(src).toMatch(/outerScrollOffset/);
});
