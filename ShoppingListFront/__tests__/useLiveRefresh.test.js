/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppState } from 'react-native';
import useLiveRefresh from '../src/hooks/useLiveRefresh';

jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return { useFocusEffect: cb => R.useEffect(cb, [cb]) };
});

const { act } = ReactTestRenderer;

const Probe = ({ refresh, interval = 3000, paused }) => {
  useLiveRefresh(refresh, interval, { paused });
  return null;
};

const flush = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('useLiveRefresh', () => {
  let handler;
  let removeSpy;
  let errorSpy;

  const mount = async props => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe {...props} />);
    });
    return tree;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    handler = null;
    removeSpy = jest.fn();
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, h) => {
      handler = h;
      return { remove: removeSpy };
    });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('refreshes immediately and then every interval', async () => {
    const refresh = jest.fn().mockResolvedValue();
    await mount({ refresh });
    expect(refresh).toHaveBeenCalledTimes(1);
    await flush(3000);
    await flush(3000);
    await flush(3000);
    expect(refresh).toHaveBeenCalledTimes(4);
  });

  test('does not stack calls while a refresh is still running', async () => {
    const refresh = jest.fn(() => new Promise(() => {}));
    await mount({ refresh });
    await flush(30000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('stops in background and refreshes immediately when back to active', async () => {
    const refresh = jest.fn().mockResolvedValue();
    await mount({ refresh });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => handler('background'));
    await flush(10000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => handler('active'));
    expect(refresh).toHaveBeenCalledTimes(2);
    await flush(3000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  test('paused stops refreshing until unpaused', async () => {
    const refresh = jest.fn().mockResolvedValue();
    const tree = await mount({ refresh, paused: true });
    await flush(10000);
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => tree.update(<Probe refresh={refresh} paused={false} />));
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => tree.update(<Probe refresh={refresh} paused />));
    await flush(10000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('swallows refresh errors and keeps going', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('boom'));
    await mount({ refresh });
    await flush(3000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('uses the latest refresh without restarting timers', async () => {
    const first = jest.fn().mockResolvedValue();
    const second = jest.fn().mockResolvedValue();
    const tree = await mount({ refresh: first });
    await act(async () => tree.update(<Probe refresh={second} />));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    await flush(3000);
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('unmounting during a pending refresh does not warn', async () => {
    let resolve;
    const refresh = jest.fn(() => new Promise(r => { resolve = r; }));
    const tree = await mount({ refresh });
    await act(async () => tree.unmount());
    await act(async () => resolve());
    await flush(10000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });
});
