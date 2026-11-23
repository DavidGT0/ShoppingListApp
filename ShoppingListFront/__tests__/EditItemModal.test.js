/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';

const { act } = ReactTestRenderer;

test('reopening the edit window after cancel shows the saved name, not the discarded text', async () => {
  const item = { id: 1, name: 'חלב' };
  const props = { item, onSave: jest.fn(), onClose: jest.fn() };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<EditItemModal {...props} visible />);
  });
  const input = () => tree.root.findAllByType(TextInput)[0];

  await act(async () => input().props.onChangeText('טקסט שלא נשמר'));
  await act(async () => tree.update(<EditItemModal {...props} visible={false} />));
  await act(async () => tree.update(<EditItemModal {...props} visible />));

  expect(input().props.value).toBe('חלב');
});
