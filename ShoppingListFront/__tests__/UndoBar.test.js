/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import UndoBar from '../src/components/UndoBar/UndoBar';

const { act } = ReactTestRenderer;

test('renders nothing when not visible', () => {
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(
      <UndoBar visible={false} message="המוצר נמחק" onUndo={() => {}} />,
    );
  });
  expect(tree.toJSON()).toBeNull();
});

test('shows the message and calls onUndo from the undo button', () => {
  const onUndo = jest.fn();
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(
      <UndoBar visible message="המוצר נמחק" onUndo={onUndo} />,
    );
  });
  const texts = tree.root.findAllByType(Text).map(t => t.props.children);
  expect(texts).toEqual(['המוצר נמחק', 'בטל']);
  expect(tree.root.findAll(n => n.props.testID === 'undo_bar').length).toBeGreaterThan(0);
  const btn = tree.root.find(
    n => n.props.testID === 'undo_button' && n.props.onPress,
  );
  act(() => btn.props.onPress());
  expect(onUndo).toHaveBeenCalledTimes(1);
});
