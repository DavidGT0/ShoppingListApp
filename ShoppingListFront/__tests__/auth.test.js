/* global jest, describe, beforeEach, afterEach, test, expect */
import {
  requestPasswordReset,
  logout,
  deleteAccount,
  login,
  changeUsername,
} from '../src/services/auth';
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
  const { register } = require('../src/services/auth');

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

  test('login with an email stores the real username from the server', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'T',
        token_type: 'bearer',
        username: 'bob',
      }),
    });

    await login('Bob@Example.com', 'pw-1234');

    expect(global.fetch.mock.calls[0][1].body).toContain(
      'username=Bob%40Example.com&',
    );
    expect(await AsyncStorage.getItem('username')).toBe('bob');
    expect(await AsyncStorage.getItem('access_token')).toBe('T');
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

describe('cache clearing', () => {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('@cache_lists', '[1]');
    await AsyncStorage.setItem('@cache_items_2', '[2]');
    await AsyncStorage.setItem('access_token', 'T');
  });

  test('logout clears the token and every cache', async () => {
    await logout();
    expect(await AsyncStorage.getItem('access_token')).toBeNull();
    expect(await AsyncStorage.getItem('@cache_lists')).toBeNull();
    expect(await AsyncStorage.getItem('@cache_items_2')).toBeNull();
  });

  test('deleteAccount clears every cache on success', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200 }));
    await deleteAccount('pw');
    expect(await AsyncStorage.getItem('@cache_lists')).toBeNull();
    expect(await AsyncStorage.getItem('@cache_items_2')).toBeNull();
  });

  test('login clears a previous user cache before storing the new token', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'NEW', token_type: 'bearer' }),
    }));
    await login('bob', 'pw-1234');
    expect(await AsyncStorage.getItem('@cache_lists')).toBeNull();
    expect(await AsyncStorage.getItem('@cache_items_2')).toBeNull();
    expect(await AsyncStorage.getItem('access_token')).toBe('NEW');
  });

  test('a failed login keeps the existing cache', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'x' }),
    }));
    await expect(login('bob', 'bad')).rejects.toThrow();
    expect(await AsyncStorage.getItem('@cache_lists')).toBe('[1]');
    console.error.mockRestore();
  });

  test('logout still clears the caches when removeItem throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const spy = jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('boom'));
    await logout();
    spy.mockRestore();
    console.error.mockRestore();
    expect(await AsyncStorage.getItem('@cache_lists')).toBeNull();
    expect(await AsyncStorage.getItem('@cache_items_2')).toBeNull();
  });
});

describe('changeUsername', () => {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  beforeEach(async () => {
    global.fetch = jest.fn();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('access_token', 'OLD');
    await AsyncStorage.setItem('username', 'bob');
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('patches /users/me and stores the new token and name before resolving', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'NEW',
        token_type: 'bearer',
        username: 'robert',
      }),
    });

    const name = await changeUsername('  robert ');

    expect(name).toBe('robert');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/users/me`);
    expect(options.method).toBe('PATCH');
    expect(options.headers.Authorization).toBe('Bearer OLD');
    expect(JSON.parse(options.body)).toEqual({ username: 'robert' });
    expect(await AsyncStorage.getItem('access_token')).toBe('NEW');
    expect(await AsyncStorage.getItem('username')).toBe('robert');
  });

  test('shows the server Hebrew message and keeps the old session', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'שם המשתמש כבר תפוס' }),
    });

    await expect(changeUsername('alice')).rejects.toThrow('שם המשתמש כבר תפוס');
    expect(await AsyncStorage.getItem('access_token')).toBe('OLD');
    expect(await AsyncStorage.getItem('username')).toBe('bob');
  });

  test('refuses an empty name or one with @ before calling the server', async () => {
    await expect(changeUsername('   ')).rejects.toThrow('נא להזין שם משתמש');
    await expect(changeUsername('a@b')).rejects.toThrow(
      'שם המשתמש לא יכול להכיל @',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a 401 on the rename request itself (expired token) expires the session', async () => {
    const { setSessionExpiredHandler } = require('../src/services/http');
    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);
    global.fetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(changeUsername('robert')).rejects.toMatchObject({
      sessionExpired: true,
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('access_token')).toBeNull();
  });
});
