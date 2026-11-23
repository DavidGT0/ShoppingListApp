/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, StyleSheet, TextInput } from 'react-native';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import { makeStyles } from '../src/components/EditItemModal/EditItemModal.styles';
import { colors } from '../src/theme/colors';

const styles = makeStyles(colors);

const { act } = ReactTestRenderer;
const customs = [{ id: 5, name: 'מתנות', color: '#123456' }];

const setup = async (overrides = {}) => {
  const props = {
    item: { id: 1, name: 'חלב', category: null },
    categories: customs,
    onSave: jest.fn(),
    onClose: jest.fn(),
    onCreateCategory: jest.fn(),
    onDeleteCategory: jest.fn(),
    visible: true,
    ...overrides,
  };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<EditItemModal {...props} />);
  });
  const byId = id => {
    const found = tree.root.findAllByProps({ testID: id });
    if (!found.length) throw new Error('missing ' + id);
    return found[0];
  };
  return { tree, props, byId };
};

test('choosing a built-in chip sends it with the name', async () => {
  const { props, byId } = await setup();
  await act(async () => byId('category_chip_dairy').props.onPress());
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({ name: 'חלב', category: 'dairy' });
});

test('choosing a custom chip sends custom:<id>', async () => {
  const { props, byId } = await setup();
  await act(async () => byId('category_chip_custom:5').props.onPress());
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: 'custom:5',
  });
});

test('"אוטומטי" sends category null', async () => {
  const { props, byId } = await setup({
    item: { id: 1, name: 'חלב', category: 'snacks' },
  });
  await act(async () => byId('category_chip_auto').props.onPress());
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({ name: 'חלב', category: null });
});

test('opens with the current manual category selected and is not resent', async () => {
  const { props, byId } = await setup({
    item: { id: 1, name: 'חלב', category: 'custom:5' },
  });
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: undefined,
  });
});

test('a dangling custom reference opens as automatic but is not sent unless touched', async () => {
  const { props, byId } = await setup({
    item: { id: 1, name: 'חלב', category: 'custom:99' },
  });
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: undefined,
  });
});

test('a name-only edit never touches the category (custom:5 while categories are not loaded)', async () => {
  const { props, tree, byId } = await setup({
    item: { id: 1, name: 'חלב', category: 'custom:5' },
    categories: [],
  });
  await act(async () =>
    tree.root.findAllByType(TextInput)[0].props.onChangeText('חלב עיזים'),
  );
  await act(async () => byId('edit_save_button').props.onPress());
  const sent = props.onSave.mock.calls[0][0];
  expect(sent.name).toBe('חלב עיזים');
  expect(sent.category).toBeUndefined();
});

test('a failed delete keeps the selection', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { props, byId } = await setup({
    item: { id: 1, name: 'חלב', category: 'custom:5' },
    onDeleteCategory: jest.fn().mockResolvedValue(false),
  });
  await act(async () => byId('category_chip_custom:5').props.onLongPress());
  const destructive = alertSpy.mock.calls[0][2].find(
    b => b.style === 'destructive',
  );
  await act(async () => destructive.onPress());
  await act(async () => byId('category_chip_custom:5').props.onPress());
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: 'custom:5',
  });
  alertSpy.mockRestore();
});

test('creating a new category creates it, then selects it', async () => {
  const onCreateCategory = jest
    .fn()
    .mockResolvedValue({ id: 8, name: 'חיות', color: '#abcdef' });
  const { props, byId, tree } = await setup({ onCreateCategory });
  await act(async () => byId('category_chip_new').props.onPress());
  const input = byId('new_category_input');
  expect(input.props.maxLength).toBe(30);
  await act(async () => input.props.onChangeText('  חיות  '));
  await act(async () => byId('new_category_save').props.onPress());
  expect(onCreateCategory).toHaveBeenCalledWith('חיות');
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: 'custom:8',
  });
  expect(
    tree.root.findAllByProps({ testID: 'new_category_input' }),
  ).toHaveLength(0);
});

test('a blank new category name is not sent', async () => {
  const { props, byId } = await setup();
  await act(async () => byId('category_chip_new').props.onPress());
  await act(async () => byId('new_category_input').props.onChangeText('   '));
  await act(async () => byId('new_category_save').props.onPress());
  expect(props.onCreateCategory).not.toHaveBeenCalled();
});

test('a failed create sends no category change', async () => {
  const onCreateCategory = jest.fn().mockResolvedValue(undefined);
  const { props, byId } = await setup({ onCreateCategory });
  await act(async () => byId('category_chip_new').props.onPress());
  await act(async () => byId('new_category_input').props.onChangeText('חיות'));
  await act(async () => byId('new_category_save').props.onPress());
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: undefined,
  });
});

test('long-press on a custom chip confirms, then deletes', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { props, byId } = await setup({
    item: { id: 1, name: 'חלב', category: 'custom:5' },
    onDeleteCategory: jest.fn().mockResolvedValue(true),
  });
  await act(async () => byId('category_chip_custom:5').props.onLongPress());
  expect(alertSpy).toHaveBeenCalledTimes(1);
  expect(props.onDeleteCategory).not.toHaveBeenCalled();
  const buttons = alertSpy.mock.calls[0][2];
  const destructive = buttons.find(b => b.style === 'destructive');
  await act(async () => destructive.onPress());
  expect(props.onDeleteCategory).toHaveBeenCalledWith(customs[0]);
  await act(async () => byId('category_chip_auto').props.onPress());
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({ name: 'חלב', category: null });
  alertSpy.mockRestore();
});

test('built-in chips have no long-press delete', async () => {
  const { byId } = await setup();
  expect(byId('category_chip_dairy').props.onLongPress).toBeUndefined();
});

test('name editing still works', async () => {
  const { tree, props, byId } = await setup();
  await act(async () =>
    tree.root.findAllByType(TextInput)[0].props.onChangeText('חלב עיזים'),
  );
  await act(async () => byId('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב עיזים',
    category: undefined,
  });
});

test('chip order: auto, built-ins, custom categories, then other last', async () => {
  const { tree } = await setup();
  const ids = tree.root
    .findAll(
      n =>
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('category_chip_') &&
        typeof n.type === 'string',
    )
    .map(n => n.props.testID.replace('category_chip_', ''));
  expect(ids[0]).toBe('auto');
  expect(ids.slice(-3)).toEqual(['custom:5', 'other', 'new']);
  expect(ids.indexOf('dairy')).toBeLessThan(ids.indexOf('custom:5'));
});

test('categories that load after opening select the stored custom category, still not resent', async () => {
  const props = {
    item: { id: 1, name: 'חלב', category: 'custom:5' },
    categories: [],
    onSave: jest.fn(),
    onClose: jest.fn(),
    visible: true,
  };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<EditItemModal {...props} />);
  });
  const chip = () =>
    tree.root.findAllByProps({ testID: 'category_chip_custom:5' })[0];
  expect(chip()).toBeUndefined();
  await act(async () => {
    tree.update(<EditItemModal {...props} categories={customs} />);
  });
  const bg = c => StyleSheet.flatten(c.props.style).backgroundColor;
  const auto = tree.root.findAllByProps({ testID: 'category_chip_auto' })[0];
  expect(bg(chip())).toBe(styles.chipActive.backgroundColor);
  expect(bg(auto)).not.toBe(styles.chipActive.backgroundColor);
  await act(async () =>
    tree.root.findAllByProps({ testID: 'edit_save_button' })[0].props.onPress(),
  );
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: undefined,
  });
});

test('a touched custom selection that disappears from categories falls back to the stored category', async () => {
  const props = {
    item: { id: 1, name: 'חלב', category: 'snacks' },
    categories: customs,
    onSave: jest.fn(),
    onClose: jest.fn(),
    visible: true,
  };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<EditItemModal {...props} />);
  });
  const find = id => tree.root.findAllByProps({ testID: id })[0];
  await act(async () => find('category_chip_custom:5').props.onPress());
  await act(async () => {
    tree.update(<EditItemModal {...props} categories={[]} />);
  });
  await act(async () => find('edit_save_button').props.onPress());
  expect(props.onSave).toHaveBeenCalledWith({
    name: 'חלב',
    category: undefined,
  });
});
