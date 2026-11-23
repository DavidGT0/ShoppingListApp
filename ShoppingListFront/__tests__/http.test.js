/* global jest, describe, beforeEach, test, expect */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiFetch,
  publicFetch,
  readErrorMessage,
  wakeUpServer,
  setSessionExpiredHandler,
  API_BASE_URL,
  REQUEST_TIMEOUT_MS,
} from '../src/services/http';

const mockFetchStatus = status => {
  global.fetch = jest.fn(async () => ({ status, ok: status < 400 }));
};

describe('apiFetch', () => {
  let onExpired;

  beforeEach(async () => {
    await AsyncStorage.clear();
    onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);
  });

  test('sends the saved token and merges custom options', async () => {
    await AsyncStorage.setItem('access_token', 'T1');
    mockFetchStatus(200);

    const response = await apiFetch('/lists', {
      method: 'POST',
      headers: { X: '1' },
    });

    expect(response.status).toBe(200);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/lists`);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer T1');
    expect(options.headers.X).toBe('1');
    expect(onExpired).not.toHaveBeenCalled();
  });

  test('on 401: clears the token, notifies once even for parallel requests, and throws sessionExpired', async () => {
    await AsyncStorage.setItem('access_token', 'T-parallel');
    mockFetchStatus(401);

    const results = await Promise.allSettled([
      apiFetch('/lists'),
      apiFetch('/items?list_id=1'),
    ]);

    expect(results.every(r => r.reason?.sessionExpired === true)).toBe(true);
    expect(await AsyncStorage.getItem('access_token')).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  test('on 401: also clears every offline cache', async () => {
    await AsyncStorage.setItem('access_token', 'T-cache');
    await AsyncStorage.setItem('@cache_lists', '[1]');
    await AsyncStorage.setItem('@cache_items_4', '[2]');
    mockFetchStatus(401);

    await expect(apiFetch('/lists')).rejects.toMatchObject({
      sessionExpired: true,
    });

    expect(await AsyncStorage.getItem('@cache_lists')).toBeNull();
    expect(await AsyncStorage.getItem('@cache_items_4')).toBeNull();
  });

  test('a later session that expires notifies again', async () => {
    mockFetchStatus(401);
    await AsyncStorage.setItem('access_token', 'T-first');
    await expect(apiFetch('/lists')).rejects.toMatchObject({
      sessionExpired: true,
    });
    await AsyncStorage.setItem('access_token', 'T-second');
    await expect(apiFetch('/lists')).rejects.toMatchObject({
      sessionExpired: true,
    });
    expect(onExpired).toHaveBeenCalledTimes(2);
  });

  test('on 401 without a token: throws but does not notify', async () => {
    mockFetchStatus(401);
    await expect(apiFetch('/lists')).rejects.toMatchObject({
      sessionExpired: true,
    });
    expect(onExpired).not.toHaveBeenCalled();
  });

  test('other errors (500) do not touch the token', async () => {
    await AsyncStorage.setItem('access_token', 'T500');
    mockFetchStatus(500);

    const response = await apiFetch('/lists');

    expect(response.status).toBe(500);
    expect(await AsyncStorage.getItem('access_token')).toBe('T500');
    expect(onExpired).not.toHaveBeenCalled();
  });
});

describe('network problems', () => {
  test('a request that takes too long fails with a Hebrew timeout message', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (url, { signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    const request = publicFetch('/token', { method: 'POST' });
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    await expect(request).rejects.toThrow('השרת לא מגיב');
    jest.useRealTimers();
  });

  test('no connection fails with a Hebrew message instead of a technical one', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(publicFetch('/token')).rejects.toThrow('אין חיבור לשרת');
  });

  test('apiFetch has the same protection', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(apiFetch('/lists')).rejects.toThrow('אין חיבור לשרת');
  });
});

describe('readErrorMessage', () => {
  const response = json => ({ ok: false, status: 400, json });

  test('uses the server text when it is a string', async () => {
    const message = await readErrorMessage(
      response(async () => ({ detail: 'הסיסמה שגויה' })),
      'fallback',
    );
    expect(message).toBe('הסיסמה שגויה');
  });

  test('turns a field validation error (422) into a readable Hebrew message', async () => {
    const message = await readErrorMessage(
      response(async () => ({
        detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email' }],
      })),
      'fallback',
    );
    expect(message).toBe('כתובת האימייל אינה תקינה');
  });

  test('falls back when the response is not JSON (e.g. an HTML error page)', async () => {
    const message = await readErrorMessage(
      response(async () => {
        throw new SyntaxError('JSON Parse error');
      }),
      'משהו השתבש',
    );
    expect(message).toBe('משהו השתבש');
  });
});

describe('wakeUpServer', () => {
  test('pings the server root', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200 }));
    await wakeUpServer();
    expect(global.fetch.mock.calls[0][0]).toBe(`${API_BASE_URL}/`);
  });

  test('never throws, even when the network fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(wakeUpServer()).resolves.toBeUndefined();
  });
});
