/* global jest, describe, beforeEach, afterEach, test, expect */
import { updateItem, deleteItem } from '../src/services/api';

describe('item api errors carry the HTTP status', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([403, 404])('deleteItem rejects with status %i', async status => {
    global.fetch.mockResolvedValue({ ok: false, status });
    await expect(deleteItem(1)).rejects.toMatchObject({
      status,
      message: 'Network response was not ok',
    });
  });

  test.each([403, 404])('updateItem rejects with status %i', async status => {
    global.fetch.mockResolvedValue({ ok: false, status });
    await expect(updateItem(1, { amount: 2 })).rejects.toMatchObject({
      status,
      message: 'Network response was not ok',
    });
  });
});
