/* global jest, describe, beforeEach, test, expect */
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
