/* global jest, test, expect, beforeEach, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppState } from 'react-native';
import useLiveRefresh from '../src/hooks/useLiveRefresh';

// המעבר למסך עריכת המחלקות מוציא את מסך הרשימה מפוקוס, והחזרה מחזירה אותו.
// useFocusEffect אמיתי: האפקט רץ בכל כניסה לפוקוס, והניקוי בכל יציאה ממנו.
// כאן הוא נשמר כדי לדמות יציאה וחזרה
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: cb => {
    global.__focusEffect = cb;
  },
}));

const { act } = ReactTestRenderer;

const Probe = ({ refresh }) => {
  useLiveRefresh(refresh, 3000);
  return null;
};

beforeEach(() => {
  jest.useFakeTimers();
  global.__focusEffect = null;
  AppState.currentState = 'active';
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation(() => ({ remove: jest.fn() }));
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('returning to the screen refreshes immediately, not after the interval', async () => {
  const refresh = jest.fn(async () => {});
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe refresh={refresh} />);
  });
  let cleanup;
  await act(async () => {
    cleanup = global.__focusEffect();
  });
  expect(refresh).toHaveBeenCalledTimes(1);

  // יציאה למסך העריכה: אין רענון ברקע
  await act(async () => cleanup());
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
  expect(refresh).toHaveBeenCalledTimes(1);

  // חזרה: רענון מיידי
  await act(async () => {
    cleanup = global.__focusEffect();
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  await act(async () => cleanup());
  await act(async () => tree.unmount());
});
