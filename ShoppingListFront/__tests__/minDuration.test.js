/* global jest, describe, test, expect, beforeEach, afterEach */
import {
  withMinDuration,
  setMinRefreshMs,
  MIN_REFRESH_MS,
} from '../src/services/minDuration';

describe('withMinDuration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    setMinRefreshMs(0);
  });

  const settle = async () => {
    // מריץ את ה-microtasks שבין הטיימרים
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  };

  test('the default minimum is about 700 ms', () => {
    expect(MIN_REFRESH_MS).toBe(700);
  });

  test('a fast task resolves with its value only after the minimum time', async () => {
    let done = false;
    const p = withMinDuration(async () => 'ok', 700).then(v => {
      done = true;
      return v;
    });
    await settle();
    jest.advanceTimersByTime(690);
    await settle();
    expect(done).toBe(false);
    jest.advanceTimersByTime(10);
    await settle();
    expect(done).toBe(true);
    await expect(p).resolves.toBe('ok');
  });

  test('an error still waits the remaining time and is not swallowed', async () => {
    let settled = false;
    const p = withMinDuration(async () => {
      throw new Error('boom');
    }, 700);
    p.catch(() => {
      settled = true;
    });
    await settle();
    jest.advanceTimersByTime(699);
    await settle();
    expect(settled).toBe(false);
    jest.advanceTimersByTime(1);
    await settle();
    await expect(p).rejects.toThrow('boom');
  });

  test('a task slower than the minimum adds no wait', async () => {
    const spy = jest.spyOn(global, 'setTimeout');
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(1000).mockReturnValueOnce(1900);
    await expect(withMinDuration(async () => 1, 700)).resolves.toBe(1);
    expect(spy).not.toHaveBeenCalled();
    now.mockRestore();
    spy.mockRestore();
  });

  test('without an explicit time it uses the configurable minimum (0 in tests)', async () => {
    const spy = jest.spyOn(global, 'setTimeout');
    await expect(withMinDuration(async () => 2)).resolves.toBe(2);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
