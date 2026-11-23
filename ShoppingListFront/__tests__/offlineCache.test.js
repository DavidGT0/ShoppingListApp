/* global jest, describe, beforeEach, test, expect */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCache,
  readCache,
  clearAllCaches,
  cacheKeys,
  loadWithCache,
} from '../src/services/offlineCache';

const networkError = () => {
  const error = new Error('offline');
  error.network = true;
  return error;
};

describe('offlineCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('cache keys follow the agreed format', () => {
    expect(cacheKeys.lists).toBe('@cache_lists');
    expect(cacheKeys.items(7)).toBe('@cache_items_7');
    expect(cacheKeys.categories(7)).toBe('@cache_categories_7');
  });

  test('save and read round trip', async () => {
    await saveCache(cacheKeys.lists, [{ id: 1, name: 'A' }]);
    expect(await readCache(cacheKeys.lists)).toEqual([{ id: 1, name: 'A' }]);
  });

  test('read returns null when missing or corrupt', async () => {
    expect(await readCache('@cache_missing')).toBeNull();
    await AsyncStorage.setItem('@cache_bad', '{not json');
    expect(await readCache('@cache_bad')).toBeNull();
  });

  test('clearAllCaches removes only @cache_ keys', async () => {
    await saveCache(cacheKeys.lists, [1]);
    await saveCache(cacheKeys.items(3), [2]);
    await AsyncStorage.setItem('access_token', 'T');
    await clearAllCaches();
    expect(await readCache(cacheKeys.lists)).toBeNull();
    expect(await readCache(cacheKeys.items(3))).toBeNull();
    expect(await AsyncStorage.getItem('access_token')).toBe('T');
  });

  test('loadWithCache saves and returns fresh data', async () => {
    const result = await loadWithCache(async () => ['x'], cacheKeys.lists);
    expect(result).toEqual({ data: ['x'], fromCache: false });
    expect(await readCache(cacheKeys.lists)).toEqual(['x']);
  });

  test('loadWithCache falls back to cache on a network error', async () => {
    await saveCache(cacheKeys.lists, ['old']);
    const result = await loadWithCache(async () => {
      throw networkError();
    }, cacheKeys.lists);
    expect(result).toEqual({ data: ['old'], fromCache: true });
  });

  test('loadWithCache rethrows a network error when nothing is cached', async () => {
    await expect(
      loadWithCache(async () => {
        throw networkError();
      }, cacheKeys.lists),
    ).rejects.toMatchObject({ network: true });
  });

  test('loadWithCache rethrows other errors without reading the cache', async () => {
    await saveCache(cacheKeys.lists, ['old']);
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    const failure = Object.assign(new Error('boom'), { status: 500 });
    await expect(
      loadWithCache(async () => {
        throw failure;
      }, cacheKeys.lists),
    ).rejects.toBe(failure);
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
    expect(await readCache(cacheKeys.lists)).toEqual(['old']);
  });
});
