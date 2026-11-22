/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Switch, Alert } from 'react-native';
import { changePassword } from '../src/services/auth';
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

const renderSettings = async () => {
  let tree;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SettingsScreen navigation={{ goBack: jest.fn() }} onLogout={jest.fn()} />,
    );
  });
  return tree;
};

test('settings is a tab, so it has no "back" button', async () => {
  const tree = await renderSettings();
  const texts = tree.root
    .findAll(n => typeof n.props.children === 'string')
    .map(n => n.props.children);
  expect(texts.some(t => t.includes('חזור'))).toBe(false);
});

test('a new password shorter than 4 characters is rejected before calling the server', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const tree = await renderSettings();
  const pressByText = async text => {
    const button = tree.root.find(
      n => n.props.onPress && n.findAll(c => c.props.children === text).length,
    );
    await ReactTestRenderer.act(async () => button.props.onPress());
  };
  const inputByPlaceholder = placeholder =>
    tree.root.find(n => n.props.placeholder === placeholder && n.props.onChangeText);

  await pressByText('שנה סיסמה');
  await ReactTestRenderer.act(async () => {
    inputByPlaceholder('סיסמה נוכחית').props.onChangeText('old-pw');
    inputByPlaceholder('סיסמה חדשה').props.onChangeText('abc');
    inputByPlaceholder('אימות סיסמה חדשה').props.onChangeText('abc');
  });
  await pressByText('שמור סיסמה');

  expect(changePassword).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'הסיסמה החדשה חייבת להכיל לפחות 4 תווים');
  alertSpy.mockRestore();
});
