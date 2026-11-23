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

describe('LoginScreen - slow server', () => {
  const { login } = require('../src/services/auth');

  test('shows a "server is waking up" note only after 5 seconds of waiting', async () => {
    jest.useFakeTimers();
    login.mockReturnValue(new Promise(() => {})); // השרת לא עונה
    const { byTestId } = await renderLogin();

    await act(async () => byTestId('username_input').props.onChangeText('bob'));
    await act(async () => byTestId('password_input').props.onChangeText('pw-1234'));
    // לא מחכים ל-onPress: ההתחברות "תקועה" בכוונה
    await act(async () => {
      byTestId('login_button').props.onPress();
    });

    await act(async () => jest.advanceTimersByTime(4900));
    expect(byTestId('slow_server_note')).toBeUndefined();

    await act(async () => jest.advanceTimersByTime(200));
    expect(byTestId('slow_server_note')).toBeDefined();
    jest.useRealTimers();
  });
});

describe('LoginScreen - registration password length', () => {
  const { register } = require('../src/services/auth');

  test('registering with a password shorter than 4 characters is rejected before calling the server', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { byTestId } = await renderLogin();
    await act(async () => byTestId('switch_mode_button').props.onPress());
    await act(async () => {
      byTestId('username_input').props.onChangeText('bob');
      byTestId('email_input').props.onChangeText('bob@example.com');
      byTestId('password_input').props.onChangeText('abc');
    });
    await act(async () => {
      byTestId('login_button').props.onPress(); // לא מחכים - ההתחברות במוק לא מסתיימת
    });

    expect(register).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'שגיאה',
      'הסיסמה חייבת להכיל לפחות 4 תווים',
    );
    alertSpy.mockRestore();
  });
});

describe('LoginScreen - branding', () => {
  test('shows the logo image, brand title and subtitle, without the cart emoji', async () => {
    const { tree, byTestId } = await renderLogin();
    const logo = byTestId('login_logo');
    expect(logo).toBeDefined();
    expect(logo.props.resizeMode).toBe('contain');
    const texts = tree.root
      .findAll(n => typeof n.props.children === 'string')
      .map(n => n.props.children);
    expect(texts).toContain('ShopLi');
    expect(texts).toContain('רשימת הקניות המשפחתית');
    expect(texts.some(t => t.includes('🛒'))).toBe(false);
  });
});

describe('LoginScreen - login with username or email', () => {
  test('login mode asks for a username or an email; registration keeps "שם משתמש"', async () => {
    const { byTestId } = await renderLogin();
    expect(byTestId('username_input').props.accessibilityLabel).toBe(
      'שם משתמש או אימייל',
    );
    expect(byTestId('username_input').props.placeholder).toBe(
      'שם משתמש או אימייל',
    );
    await act(async () => byTestId('switch_mode_button').props.onPress());
    expect(byTestId('username_input').props.accessibilityLabel).toBe('שם משתמש');
  });
});
