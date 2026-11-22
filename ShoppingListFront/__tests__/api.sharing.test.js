/* global jest, describe, beforeEach, afterEach, test, expect */
import {
  joinListByCode,
  getShoppingList,
  getListMembers,
} from '../src/services/api';
import { extractInviteCode } from '../src/services/inviteCode';
import { API_BASE_URL } from '../src/services/http';

describe('sharing api calls', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('joinListByCode posts the code to /lists/join', async () => {
    const list = { id: 5, name: 'קניות', owner_id: 2, is_owner: false };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => list,
    });

    const result = await joinListByCode('K7M2Q9');

    expect(result).toEqual(list);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/lists/join`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ code: 'K7M2Q9' });
  });

  test("joinListByCode throws the server's Hebrew message", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'קוד ההזמנה לא נמצא' }),
    });

    await expect(joinListByCode('AAAAAA')).rejects.toMatchObject({
      message: 'קוד ההזמנה לא נמצא',
      status: 404,
    });
  });

  test('getShoppingList error carries the HTTP status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    await expect(getShoppingList(1)).rejects.toMatchObject({ status: 403 });
  });

  test('getListMembers returns the array', async () => {
    const members = [
      { id: 1, username: 'alice', is_owner: true },
      { id: 2, username: 'bob', is_owner: false },
    ];
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => members,
    });

    expect(await getListMembers(7)).toEqual(members);
    expect(global.fetch.mock.calls[0][0]).toBe(
      `${API_BASE_URL}/lists/7/members`,
    );
  });
});

describe('extractInviteCode', () => {
  test('finds the code inside the full WhatsApp message', () => {
    const text =
      'הצטרפו לרשימת הקניות "קניות לשבת" שלי ב-ShopLi 🛒\n' +
      'באפליקציה: הרשימות שלי ← "הצטרפות עם קוד" ← הקוד: K7M2Q9';
    expect(extractInviteCode(text)).toBe('K7M2Q9');
  });

  test('accepts a lowercase code with spaces', () => {
    expect(extractInviteCode(' k7m2q9 ')).toBe('K7M2Q9');
  });
});
