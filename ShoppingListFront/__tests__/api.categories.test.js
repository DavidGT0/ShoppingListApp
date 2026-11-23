/* global jest, describe, beforeEach, afterEach, test, expect */
import {
  getListCategories,
  createListCategory,
  saveCategoryLayout,
} from '../src/services/api';
import { API_BASE_URL } from '../src/services/http';

describe('department layout api calls', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getListCategories returns {custom, layout}', async () => {
    const body = {
      custom: [{ id: 1, name: 'מתנות', color: '#111111', icon: '🎁' }],
      layout: [{ key: 'dairy', name: 'חלבי', icon: '🧀', position: 0 }],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });
    expect(await getListCategories(7)).toEqual(body);
    expect(global.fetch.mock.calls[0][0]).toBe(
      `${API_BASE_URL}/lists/7/categories`,
    );
  });

  test('an old array answer is treated as {custom, layout: []}', async () => {
    const old = [{ id: 1, name: 'מתנות', color: '#111111' }];
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => old,
    });
    expect(await getListCategories(7)).toEqual({ custom: old, layout: [] });
  });

  test('saveCategoryLayout PUTs the layout', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const layout = [{ key: 'dairy', name: 'חלבי', icon: '🧀' }, { key: 'other' }];
    await saveCategoryLayout(7, layout);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/lists/7/categories/layout`);
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ layout });
  });

  test("saveCategoryLayout throws the server's Hebrew message", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'השם ארוך מדי' }),
    });
    await expect(saveCategoryLayout(7, [])).rejects.toMatchObject({
      message: 'השם ארוך מדי',
      status: 400,
    });
  });

  test('createListCategory sends the optional icon', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 3 }),
    });
    await createListCategory(7, 'מתנות', '🎁');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      name: 'מתנות',
      icon: '🎁',
    });
    await createListCategory(7, 'חיות');
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      name: 'חיות',
    });
  });
});
