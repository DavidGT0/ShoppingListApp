/* global jest, test, expect, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef(({ children }, _ref) => <>{children}</>),
  };
});
jest.mock('react-native-gesture-handler', () => {
  const { TouchableOpacity } = require('react-native');
  return { TouchableOpacity };
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';

const { act } = ReactTestRenderer;

const render = async (item, extra = {}) => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ShoppingListItem
        item={{ id: 1, name: 'עגבניות', amount: 2, purchased: false, ...item }}
        onTogglePurchased={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAmount={jest.fn()}
        {...extra}
      />,
    );
  });
  trees.push(tree);
  const find = id => tree.root.findAllByProps({ testID: id });
  return { tree, find };
};

const textOf = nodes => nodes[0].props.children;

const trees = [];
afterEach(() => {
  trees.splice(0).forEach(t => act(() => t.unmount()));
});

test('amount shows with its unit, or alone without one', async () => {
  let r = await render({ unit: 'ק״ג' });
  expect(textOf(r.find('item_amount'))).toBe('2 ק״ג');
  r = await render({ unit: null });
  expect(textOf(r.find('item_amount'))).toBe('2');
});

test('note is shown under the name, hidden when empty', async () => {
  let r = await render({ note: 'שרי' });
  expect(textOf(r.find('item_note'))).toBe('שרי');
  r = await render({ note: null });
  expect(r.find('item_note')).toHaveLength(0);
});

test('added-by: shown only for another member with showAddedBy', async () => {
  const item = { added_by: 'dana' };
  let r = await render(item, { showAddedBy: true, currentUsername: 'omer' });
  expect(textOf(r.find('item_added_by')).join('')).toBe('נוסף ע״י dana');
  // showAddedBy off
  r = await render(item, { showAddedBy: false, currentUsername: 'omer' });
  expect(r.find('item_added_by')).toHaveLength(0);
  // own item
  r = await render(item, { showAddedBy: true, currentUsername: 'dana' });
  expect(r.find('item_added_by')).toHaveLength(0);
  // legacy trailing-space username of the same user
  r = await render(
    { added_by: 'dana ' },
    { showAddedBy: true, currentUsername: 'dana' },
  );
  expect(r.find('item_added_by')).toHaveLength(0);
  // no adder
  r = await render(
    { added_by: null },
    { showAddedBy: true, currentUsername: 'omer' },
  );
  expect(r.find('item_added_by')).toHaveLength(0);
});
