/* global jest, describe, beforeEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import { requestPasswordReset } from '../src/services/auth';

jest.mock('../src/services/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

const { act } = ReactTestRenderer;

const renderLogin = async () => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<LoginScreen onLoginSuccess={jest.fn()} />);
  });
  const byTestId = id => tree.root.findAll(n => n.props.testID === id)[0];
  return { tree, byTestId };
};

describe('LoginScreen - forgot password', () => {
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('link opens a form that sends the email and shows the server message', async () => {
    requestPasswordReset.mockResolvedValue('אם כתובת האימייל רשומה...');
    const { byTestId } = await renderLogin();
    expect(byTestId('forgot_email_input')).toBeUndefined();

    await act(async () => byTestId('forgot_password_link').props.onPress());
    await act(async () =>
      byTestId('forgot_email_input').props.onChangeText('alice@example.com'),
    );
    await act(async () => byTestId('forgot_send_button').props.onPress());

    expect(requestPasswordReset).toHaveBeenCalledWith('alice@example.com');
    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      'אם כתובת האימייל רשומה...',
    );
    expect(byTestId('forgot_email_input')).toBeUndefined(); // הטופס נסגר
  });

  test('empty email shows an error and does not call the server', async () => {
    const { byTestId } = await renderLogin();
    await act(async () => byTestId('forgot_password_link').props.onPress());
    await act(async () => byTestId('forgot_send_button').props.onPress());

    expect(requestPasswordReset).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', expect.any(String));
  });

  test('server error is shown and the form stays open', async () => {
    requestPasswordReset.mockRejectedValue(new Error('לא הצלחנו לשלוח'));
    const { byTestId } = await renderLogin();
    await act(async () => byTestId('forgot_password_link').props.onPress());
    await act(async () =>
      byTestId('forgot_email_input').props.onChangeText('alice@example.com'),
    );
    await act(async () => byTestId('forgot_send_button').props.onPress());

    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו לשלוח');
    expect(byTestId('forgot_email_input')).toBeDefined();
  });

  test('link appears only in login mode, not in registration', async () => {
    const { byTestId } = await renderLogin();
    expect(byTestId('forgot_password_link')).toBeDefined();
    await act(async () => byTestId('switch_mode_button').props.onPress());
    expect(byTestId('forgot_password_link')).toBeUndefined();
  });
});
