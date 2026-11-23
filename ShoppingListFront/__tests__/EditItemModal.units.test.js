/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';

const { act } = ReactTestRenderer;

const setup = async (item = { id: 1, name: 'חלב', category: null }) => {
  const props = {
    item,
    categories: [],
    onSave: jest.fn(),
    onClose: jest.fn(),
    visible: true,
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
  const save = async () =>
    act(async () => byId('edit_save_button').props.onPress());
  return { tree, props, byId, save };
};

test('unit and note are not sent when untouched', async () => {
  const { props, save } = await setup({
    id: 1,
    name: 'חלב',
    unit: 'ליטר',
    note: 'דל',
  });
  await save();
  const arg = props.onSave.mock.calls[0][0];
  expect(arg.unit).toBeUndefined();
  expect(arg.note).toBeUndefined();
});

test('choosing a unit sends it', async () => {
  const { props, byId, save } = await setup();
  await act(async () => byId('unit_chip_ק״ג').props.onPress());
  await save();
  expect(props.onSave.mock.calls[0][0].unit).toBe('ק״ג');
});

test('the "none" chip sends unit null', async () => {
  const { props, byId, save } = await setup({
    id: 1,
    name: 'חלב',
    unit: 'גרם',
  });
  await act(async () => byId('unit_chip_none').props.onPress());
  await save();
  expect(props.onSave.mock.calls[0][0].unit).toBeNull();
});

test('typing a note sends it trimmed; clearing it sends null', async () => {
  const { props, byId, save } = await setup();
  await act(async () => byId('note_input').props.onChangeText('  שרי  '));
  await save();
  expect(props.onSave.mock.calls[0][0].note).toBe('שרי');
  await act(async () => byId('note_input').props.onChangeText('   '));
  await save();
  expect(props.onSave.mock.calls[1][0].note).toBeNull();
});

test('note input is limited to 100 characters and preloaded', async () => {
  const { byId } = await setup({ id: 1, name: 'חלב', note: 'דל' });
  expect(byId('note_input').props.maxLength).toBe(100);
  expect(byId('note_input').props.value).toBe('דל');
});
