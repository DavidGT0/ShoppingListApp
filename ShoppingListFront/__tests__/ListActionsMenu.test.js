/* global jest, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ListActionsMenu from '../src/components/ListActionsMenu/ListActionsMenu';

const { act } = ReactTestRenderer;

const render = async list => {
  let tree;
  const handlers = {
    onClose: jest.fn(),
    onRename: jest.fn(),
    onDuplicate: jest.fn(),
    onShareText: jest.fn(),
    onDelete: jest.fn(),
  };
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ListActionsMenu visible list={list} {...handlers} />,
    );
  });
  const has = id => tree.root.findAll(n => n.props.testID === id).length > 0;
  return { tree, has, handlers };
};

describe('ListActionsMenu', () => {
  test('owner sees all four options', async () => {
    const { has } = await render({ id: 1, name: 'א', is_owner: true });
    ['menu_rename', 'menu_duplicate', 'menu_share_text', 'menu_delete'].forEach(
      id => expect(has(id)).toBe(true),
    );
  });

  test('member sees only duplicate and share text', async () => {
    const { has } = await render({ id: 2, name: 'ב', is_owner: false });
    expect(has('menu_duplicate')).toBe(true);
    expect(has('menu_share_text')).toBe(true);
    expect(has('menu_rename')).toBe(false);
    expect(has('menu_delete')).toBe(false);
  });

  test('pressing an option calls its handler with the list', async () => {
    const list = { id: 1, name: 'א', is_owner: true };
    const { tree, handlers } = await render(list);
    const press = id =>
      tree.root.findAll(n => n.props.testID === id)[0].props.onPress();
    await act(async () => press('menu_duplicate'));
    expect(handlers.onDuplicate).toHaveBeenCalledWith(list);
  });
});
