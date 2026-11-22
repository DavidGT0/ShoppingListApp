/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import PurchasedItemsSection from '../src/components/PurchasedItemsSection/PurchasedItemsSection';

jest.mock('../src/components/ShoppingListItem/ShoppingListItem', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ item }) => ReactLib.createElement(Text, null, item.name),
  };
});

const { act } = ReactTestRenderer;
const items = [{ id: 1, name: 'חלב', amount: 1, purchased: true }];
const button = (tree, id) =>
  tree.root.find(n => n.props.testID === id && typeof n.type === 'function');

describe('PurchasedItemsSection header buttons', () => {
  let alertSpy;
  let tree;
  const onRestoreAll = jest.fn();
  const onClearAll = jest.fn();
  const press = id => act(() => button(tree, id).props.onPress());
  const lastDialog = () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1];

  beforeEach(() => {
    onRestoreAll.mockReset();
    onClearAll.mockReset();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    act(() => {
      tree = ReactTestRenderer.create(
        <PurchasedItemsSection
          items={items}
          onTogglePurchased={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onUpdateAmount={() => {}}
          onRestoreAll={onRestoreAll}
          onClearAll={onClearAll}
        />,
      );
    });
  });
  afterEach(() => {
    alertSpy.mockRestore();
    act(() => tree.unmount());
  });

  test('restore asks for confirmation, then calls onRestoreAll', () => {
    press('restore_all_button');
    expect(onRestoreAll).not.toHaveBeenCalled();
    const [title, message, buttons] = lastDialog();
    expect(title).toBe('החזר הכל לרשימה');
    expect(message).toBe('להחזיר את כל המוצרים שנקנו לרשימה?');
    act(() => buttons.find(b => b.style !== 'cancel').onPress());
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
  });

  test('cancelling the restore does not call onRestoreAll', () => {
    press('restore_all_button');
    const cancel = lastDialog()[2].find(b => b.style === 'cancel');
    if (cancel.onPress) act(() => cancel.onPress());
    expect(onRestoreAll).not.toHaveBeenCalled();
  });

  test('clear asks for confirmation, then calls onClearAll', () => {
    press('clear_purchased_button');
    expect(onClearAll).not.toHaveBeenCalled();
    const [, message, buttons] = lastDialog();
    expect(message).toBe('למחוק את כל המוצרים שנקנו?');
    act(() => buttons.find(b => b.style === 'destructive').onPress());
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  test('cancelling the clear does not call onClearAll', () => {
    press('clear_purchased_button');
    const cancel = lastDialog()[2].find(b => b.style === 'cancel');
    if (cancel.onPress) act(() => cancel.onPress());
    expect(onClearAll).not.toHaveBeenCalled();
  });
});
