/* global describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import ProgressRing from '../src/components/ProgressRing/ProgressRing';

const { act } = ReactTestRenderer;

const render = async props => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ProgressRing {...props} />);
  });
  return tree;
};

const ring = tree =>
  tree.root.find(
    n => n.props.testID === 'progress_ring' && typeof n.type === 'string',
  );
const rotation = (tree, id) => {
  const node = tree.root.find(
    n => n.props.testID === id && typeof n.type === 'string',
  );
  const { transform } = StyleSheet.flatten(node.props.style);
  return transform[0].rotate;
};
const label = tree =>
  tree.root
    .findAllByType(Text)
    .map(n => [].concat(n.props.children).join(''))
    .join('');

describe('ProgressRing', () => {
  test('announces how many were bought in Hebrew', async () => {
    const tree = await render({ done: 3, total: 12 });
    expect(ring(tree).props.accessibilityLabel).toBe('נקנו 3 מתוך 12');
    expect(ring(tree).props.accessible).toBe(true);
    expect(label(tree)).toBe('3/12');
  });

  test('a quarter fills only the first half, by 90 degrees', async () => {
    const tree = await render({ done: 3, total: 12 });
    expect(rotation(tree, 'progress_ring_first')).toBe('90deg');
    expect(rotation(tree, 'progress_ring_second')).toBe('0deg');
  });

  test('three quarters fill the first half and half of the second', async () => {
    const tree = await render({ done: 9, total: 12 });
    expect(rotation(tree, 'progress_ring_first')).toBe('180deg');
    expect(rotation(tree, 'progress_ring_second')).toBe('90deg');
  });

  test('all bought fills the whole ring', async () => {
    const tree = await render({ done: 12, total: 12 });
    expect(rotation(tree, 'progress_ring_first')).toBe('180deg');
    expect(rotation(tree, 'progress_ring_second')).toBe('180deg');
  });

  test('an empty list (0/0) does not divide by zero', async () => {
    const tree = await render({ done: 0, total: 0 });
    expect(label(tree)).toBe('0/0');
    expect(ring(tree).props.accessibilityLabel).toBe('נקנו 0 מתוך 0');
    expect(rotation(tree, 'progress_ring_first')).toBe('0deg');
    expect(rotation(tree, 'progress_ring_second')).toBe('0deg');
  });

  test('done above total is clamped to a full ring', async () => {
    const tree = await render({ done: 5, total: 3 });
    expect(rotation(tree, 'progress_ring_first')).toBe('180deg');
    expect(rotation(tree, 'progress_ring_second')).toBe('180deg');
  });

  test('exposes progress values for screen readers', async () => {
    const tree = await render({ done: 3, total: 12 });
    expect(ring(tree).props.accessibilityRole).toBe('progressbar');
    expect(ring(tree).props.accessibilityValue).toEqual({
      min: 0,
      max: 12,
      now: 3,
    });
  });
});
