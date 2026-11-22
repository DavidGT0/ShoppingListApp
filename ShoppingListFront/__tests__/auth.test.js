/* global jest, describe, beforeEach, afterEach, test, expect */
import { requestPasswordReset } from '../src/services/auth';
import { API_BASE_URL } from '../src/services/http';

describe('requestPasswordReset', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('posts the trimmed email and returns the server message', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'נשלח קישור' }),
    });

    const message = await requestPasswordReset('  alice@example.com ');

    expect(message).toBe('נשלח קישור');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/password-reset/request`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ email: 'alice@example.com' });
  });

  test('throws a readable error when the server fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(requestPasswordReset('alice@example.com')).rejects.toThrow(
      'לא הצלחנו לשלוח את הבקשה',
    );
  });
});

describe('register and login input and errors', () => {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;
  const { register, login } = require('../src/services/auth');

  beforeEach(async () => {
    global.fetch = jest.fn();
    await AsyncStorage.clear();
    // השגיאות כאן צפויות; הקוד מדפיס אותן ל-console כרגיל
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('register trims spaces from username and email', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, username: 'bob', email: 'bob@example.com' }),
    });

    await register(' bob ', ' bob@example.com ', 'pw-1234');

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      username: 'bob',
      email: 'bob@example.com',
      password: 'pw-1234',
    });
  });

  test('register with an invalid email shows a readable message, not [object Object]', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email' }],
      }),
    });

    await expect(register('bob', 'not-an-email', 'pw-1234')).rejects.toThrow(
      'כתובת האימייל אינה תקינה',
    );
  });

  test('login trims the username and stores the trimmed one', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'T', token_type: 'bearer' }),
    });

    await login(' bob ', 'pw-1234');

    expect(global.fetch.mock.calls[0][1].body).toContain('username=bob&');
    expect(await AsyncStorage.getItem('username')).toBe('bob');
  });

  test('login shows the server message on wrong password', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'שם משתמש או סיסמה שגויים' }),
    });
    await expect(login('bob', 'wrong')).rejects.toThrow(
      'שם משתמש או סיסמה שגויים',
    );
  });

  test('login does not crash with a JSON error when the server returns an HTML error page', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('JSON Parse error: Unexpected character: <');
      },
    });
    await expect(login('bob', 'pw-1234')).rejects.toThrow(
      'ההתחברות נכשלה. נסה שוב בעוד רגע.',
    );
  });
});
