/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Switch } from 'react-native';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';

jest.mock('../src/services/auth', () => ({
  logout: jest.fn(),
  getCurrentUser: jest.fn(async () => ({
    username: 'bob',
    email: 'bob@example.com',
  })),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
}));

test('settings no longer show the auto-reset option that never worked', async () => {
  let tree;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SettingsScreen navigation={{ goBack: jest.fn() }} onLogout={jest.fn()} />,
    );
  });

  expect(tree.root.findAllByType(Switch)).toHaveLength(0);
  const texts = tree.root
    .findAll(n => typeof n.props.children === 'string')
    .map(n => n.props.children);
  expect(texts.some(t => t.includes('החזרת מוצרים'))).toBe(false);
});
