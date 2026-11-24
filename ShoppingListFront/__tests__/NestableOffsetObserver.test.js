/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// ההקשר הפנימי של המיכל המקונן: ערך גלילה משותף (Reanimated)
jest.mock(
  'react-native-draggable-flatlist/src/context/nestableScrollContainerContext',
  () => ({
    useNestableScrollContainerContext: () => global.__nestableContext,
  }),
);
// useAnimatedReaction מורץ מיד (במכשיר הוא רץ ב-UI thread בכל שינוי)
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useAnimatedReaction: (prepare, react) => {
    react(prepare(), null);
  },
  runOnJS: fn => fn,
}));

import NestableOffsetObserver from '../src/hooks/NestableOffsetObserver';

const { act } = ReactTestRenderer;

const render = onOffset => {
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(
      <NestableOffsetObserver onOffset={onOffset} />,
    );
  });
  return tree;
};

test('reports the nested container scroll offset to JS', () => {
  global.__nestableContext = { outerScrollOffset: { value: 120 } };
  const onOffset = jest.fn();
  const tree = render(onOffset);
  expect(onOffset).toHaveBeenCalledWith(120);
  expect(tree.toJSON()).toBeNull();
});

test('outside a nestable container it reports nothing and does not crash', () => {
  global.__nestableContext = undefined;
  const onOffset = jest.fn();
  render(onOffset);
  expect(onOffset).not.toHaveBeenCalled();
});
