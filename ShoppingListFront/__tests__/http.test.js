/* global jest, describe, beforeEach, test, expect */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiFetch,
  setSessionExpiredHandler,
  API_BASE_URL,
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
