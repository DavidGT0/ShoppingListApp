/* global jest, describe, test, expect, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

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

test('a disabled row disables the amount buttons', async () => {
  const { tree } = await render({}, { disabled: true });
  const disabledFlags = tree.root
    .findAll(n => n.props.android_ripple?.radius === 16 && !!n.props.onPress)
    .map(p => !!p.props.disabled);
  expect(disabledFlags).toEqual([true, true]);
});

test('an enabled row keeps the amount buttons active', async () => {
  const { tree } = await render({});
  const disabledFlags = tree.root
    .findAll(n => n.props.android_ripple?.radius === 16 && !!n.props.onPress)
    .map(p => !!p.props.disabled);
  expect(disabledFlags).toEqual([false, false]);
});

test('the check circle is a checkbox that toggles purchased', async () => {
  const onTogglePurchased = jest.fn();
  const r = await render({ id: 7 }, { onTogglePurchased });
  const [circle] = r.find('item_check_7');
  expect(circle.props.accessibilityRole).toBe('checkbox');
  expect(circle.props.accessibilityState.checked).toBe(false);
  expect(circle.props.accessibilityLabel).toBe('עגבניות');
  await act(async () => circle.props.onPress());
  expect(onTogglePurchased).toHaveBeenCalledTimes(1);
});

test('a bought row shows a checked circle that un-buys', async () => {
  const onTogglePurchased = jest.fn();
  const r = await render({ id: 7, purchased: true }, { onTogglePurchased });
  const [circle] = r.find('item_check_7');
  expect(circle.props.accessibilityState.checked).toBe(true);
  await act(async () => circle.props.onPress());
  expect(onTogglePurchased).toHaveBeenCalledTimes(1);
});

test('the trash deletes and has a Hebrew label', async () => {
  const onDelete = jest.fn();
  const r = await render({ id: 7 }, { onDelete });
  const [trash] = r.find('item_delete_7');
  expect(trash.props.accessibilityRole).toBe('button');
  expect(trash.props.accessibilityLabel).toBe('מחק את עגבניות');
  await act(async () => trash.props.onPress());
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('tapping the name opens edit', async () => {
  const onEdit = jest.fn();
  const r = await render({ id: 7 }, { onEdit });
  const [name] = r.find('item_name_7');
  expect(name.props.accessibilityRole).toBe('button');
  expect(name.props.accessibilityHint).toBe('לחיצה לעריכה');
  await act(async () => name.props.onPress());
  expect(onEdit).toHaveBeenCalledTimes(1);
});

test('offline: circle, trash and name stay pressable and not a11y-disabled', async () => {
  const fns = {
    onTogglePurchased: jest.fn(),
    onDelete: jest.fn(),
    onEdit: jest.fn(),
  };
  const r = await render({ id: 7 }, { disabled: true, ...fns });
  for (const id of ['item_check_7', 'item_delete_7', 'item_name_7']) {
    const [n] = r.find(id);
    expect(n.props.accessibilityState?.disabled).toBeUndefined();
    expect(n.props.disabled).toBeFalsy();
    await act(async () => n.props.onPress());
  }
  Object.values(fns).forEach(f => expect(f).toHaveBeenCalledTimes(1));
});

test('there is no swipe container and no pencil any more', async () => {
  const { tree } = await render({ id: 7 });
  expect(
    tree.root.findAll(n => n.props.name === 'pencil-outline'),
  ).toHaveLength(0);
  const src = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../src/components/ShoppingListItem/ShoppingListItem.js',
    ),
    'utf8',
  );
  expect(src).not.toMatch(/Swipeable/);
});

test('drag handle shows only when onDrag is given', async () => {
  let r = await render({ id: 7 });
  expect(
    r.tree.root.findAll(n => n.props.accessibilityLabel === 'גרור לסידור מחדש'),
  ).toHaveLength(0);
  r = await render({ id: 7 }, { onDrag: jest.fn() });
  expect(
    r.tree.root.findAll(n => n.props.accessibilityLabel === 'גרור לסידור מחדש')
      .length,
  ).toBeGreaterThan(0);
});

// שורות כרטיס "עכשיו במחלקה": עיגול גדול, טקסט לבן ופח לבן על הצבע הראשי
describe('focus variant', () => {
  const { StyleSheet } = require('react-native');
  const { light } = require('../src/theme/palettes');
  const hostOf = (tree, id) =>
    tree.root.findAll(
      n => n.props.testID === id && typeof n.type === 'string',
    )[0];
  const press = (tree, id) =>
    tree.root
      .findAll(n => n.props.testID === id && n.props.onPress)[0]
      .props.onPress();

  test('the check circle is at least 28dp and the text is inverse', async () => {
    const { tree } = await render({ id: 7, note: 'שרי' }, { variant: 'focus' });
    const circle = StyleSheet.flatten(hostOf(tree, 'item_check_7').props.style);
    expect(circle.width).toBeGreaterThanOrEqual(28);
    expect(circle.height).toBeGreaterThanOrEqual(28);
    expect(circle.borderColor).toBe(light.text.inverse);
    const name = tree.root.findAll(
      n => n.type === 'Text' && n.props.children === 'עגבניות',
    )[0];
    expect(StyleSheet.flatten(name.props.style).color).toBe(light.text.inverse);
    const note = hostOf(tree, 'item_note');
    expect(StyleSheet.flatten(note.props.style).color).toBe(light.text.inverse);
  });

  test('the trash icon is inverse and every control keeps working', async () => {
    const fns = {
      onTogglePurchased: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
    };
    const { tree } = await render({ id: 7 }, { variant: 'focus', ...fns });
    const trash = hostOf(tree, 'item_delete_7').findAll(
      n => n.props.name === 'trash-can-outline',
    )[0];
    expect(trash.props.color).toBe(light.text.inverse);
    press(tree, 'item_check_7');
    press(tree, 'item_name_7');
    press(tree, 'item_delete_7');
    Object.values(fns).forEach(f => expect(f).toHaveBeenCalledTimes(1));
  });

  test('the default row is unchanged without the variant', async () => {
    const { tree } = await render({ id: 7 });
    const circle = StyleSheet.flatten(hostOf(tree, 'item_check_7').props.style);
    expect(circle.width).toBe(26);
    expect(circle.borderColor).toBe(light.primaryText);
  });
});
