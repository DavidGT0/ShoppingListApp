/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Switch, Alert } from 'react-native';
import { changePassword, changeUsername } from '../src/services/auth';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';

jest.mock('../src/services/auth', () => ({
  logout: jest.fn(),
  getCurrentUser: jest.fn(async () => ({
    username: 'bob',
    email: 'bob@example.com',
  })),
  changePassword: jest.fn(),
  changeUsername: jest.fn(),
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

test('settings render the shared rounded header', async () => {
  const tree = await renderSettings();
  expect(
    tree.root.findAll(n => n.props.testID === 'settings_header').length,
  ).toBeGreaterThan(0);
});

describe('rename in settings', () => {
  const byTestId = (tree, id) =>
    tree.root.findAll(n => n.props.testID === id && n.props.onPress !== undefined || n.props.testID === id && n.props.onChangeText !== undefined)[0];
  const texts = tree =>
    tree.root
      .findAll(n => typeof n.props.children === 'string')
      .map(n => n.props.children);

  test('edit opens the field, save renames with no logout, and the new name shows', async () => {
    const onLogout = jest.fn();
    changeUsername.mockResolvedValue('robert');
    let tree;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<SettingsScreen onLogout={onLogout} />);
    });
    expect(byTestId(tree, 'username_input_settings')).toBeUndefined();
    const edit = byTestId(tree, 'edit_username_button');
    expect(edit.props.accessibilityRole).toBe('button');
    await ReactTestRenderer.act(async () => edit.props.onPress());
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'username_input_settings').props.onChangeText('robert'),
    );
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'save_username_button').props.onPress(),
    );

    expect(changeUsername).toHaveBeenCalledWith('robert');
    expect(onLogout).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('robert');
    expect(byTestId(tree, 'username_input_settings')).toBeUndefined();
  });

  test('a server error is shown and the field stays open', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    changeUsername.mockRejectedValue(new Error('שם המשתמש כבר תפוס'));
    const tree = await renderSettings();
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'edit_username_button').props.onPress(),
    );
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'username_input_settings').props.onChangeText('alice'),
    );
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'save_username_button').props.onPress(),
    );

    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'שם המשתמש כבר תפוס');
    expect(byTestId(tree, 'username_input_settings')).toBeDefined();
    alertSpy.mockRestore();
  });

  test('a name with @ is refused on the client without calling the server', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    changeUsername.mockClear();
    const tree = await renderSettings();
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'edit_username_button').props.onPress(),
    );
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'username_input_settings').props.onChangeText('a@b'),
    );
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'save_username_button').props.onPress(),
    );

    expect(changeUsername).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'שם המשתמש לא יכול להכיל @');
    alertSpy.mockRestore();
  });

  test('cancel closes the field without calling the server', async () => {
    changeUsername.mockClear();
    const tree = await renderSettings();
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'edit_username_button').props.onPress(),
    );
    await ReactTestRenderer.act(async () =>
      byTestId(tree, 'cancel_username_button').props.onPress(),
    );
    expect(byTestId(tree, 'username_input_settings')).toBeUndefined();
    expect(changeUsername).not.toHaveBeenCalled();
  });
});
