/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import { getSuggestions } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  getSuggestions: jest.fn(),
}));

const { act } = ReactTestRenderer;

const byId = (tree, id) =>
  tree.root.findAll(n => n.props.testID === id && typeof n.type === 'function');
const chipIds = tree =>
  // כל רכיב מופיע כמה פעמים בעץ (עטיפות), לכן מסירים כפילויות
  [
    ...new Set(
      tree.root
    .findAll(
      n =>
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('suggestion_chip_') &&
        typeof n.type === 'function',
    )
    .map(n => n.props.testID),
    ),
  ];

describe('AddItemInput suggestions', () => {
  let tree;
  const onAdd = jest.fn();

  const render = async () => {
    await act(async () => {
      tree = ReactTestRenderer.create(
        <AddItemInput onAdd={onAdd} listId={7} />,
      );
    });
  };
  const type = async text => {
    await act(async () =>
      byId(tree, 'add_item_input')[0].props.onChangeText(text),
    );
  };
  const wait = async ms => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    getSuggestions.mockReset();
    onAdd.mockReset();
  });
  afterEach(async () => {
    await act(async () => tree && tree.unmount());
    tree = null;
    jest.useRealTimers();
  });

  test('chips appear only after the 250ms debounce, capped at 5', async () => {
    getSuggestions.mockResolvedValue(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
    await render();
    await type('ח');
    await wait(249);
    expect(getSuggestions).not.toHaveBeenCalled();
    await wait(1);
    expect(getSuggestions).toHaveBeenCalledWith('ח', 7);
    expect(chipIds(tree)).toEqual(
      [0, 1, 2, 3, 4].map(i => `suggestion_chip_${i}`),
    );
  });

  test('tapping a chip adds the item and clears the field and chips', async () => {
    getSuggestions.mockResolvedValue(['חלב', 'חלבה']);
    await render();
    await type('חל');
    await wait(250);
    await act(async () => byId(tree, 'suggestion_chip_1')[0].props.onPress());
    expect(onAdd).toHaveBeenCalledWith('חלבה');
    expect(byId(tree, 'add_item_input')[0].props.value).toBe('');
    expect(chipIds(tree)).toEqual([]);
  });

  test('no fetch and no chips for an empty or whitespace-only field', async () => {
    getSuggestions.mockResolvedValue(['חלב']);
    await render();
    await type('   ');
    await wait(500);
    expect(getSuggestions).not.toHaveBeenCalled();
    await type('ח');
    await wait(250);
    expect(chipIds(tree).length).toBe(1);
    await type('');
    await wait(500);
    expect(chipIds(tree)).toEqual([]);
  });

  test('fetch errors are silent', async () => {
    getSuggestions.mockRejectedValue(new Error('boom'));
    await render();
    await type('ח');
    await wait(250);
    expect(chipIds(tree)).toEqual([]);
  });

  test('an out-of-order response for an older query is ignored', async () => {
    let resolveFirst;
    getSuggestions
      .mockReturnValueOnce(new Promise(r => (resolveFirst = r)))
      .mockResolvedValueOnce(['חלבה']);
    await render();
    await type('ח');
    await wait(250);
    await type('חל');
    await wait(250);
    await act(async () => resolveFirst(['ישן']));
    const labels = [
      ...new Set(
        byId(tree, 'suggestion_chip_0').map(n => n.props.accessibilityLabel),
      ),
    ];
    expect(labels).toEqual(['חלבה']);
    expect(chipIds(tree)).toEqual(['suggestion_chip_0']);
  });
});
