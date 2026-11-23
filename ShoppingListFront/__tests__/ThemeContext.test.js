/* global jest, describe, beforeEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, useStyles } from '../src/theme/ThemeContext';
import { light, dark } from '../src/theme/palettes';
import { colors } from '../src/theme/colors';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const { act } = ReactTestRenderer;

let captured;
const Probe = () => {
  captured = useTheme();
  return <Text>x</Text>;
};

const mount = async () => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  return tree;
};

describe('palettes', () => {
  test('light palette equals the legacy colors export', () => {
    expect(light).toEqual(colors);
    expect(light.background).toBe('#F8F9FA');
    expect(light.text.primary).toBe('#212529');
  });

  test('dark palette has the spec values and the same key shape', () => {
    expect(dark.background).toBe('#0B1220');
    expect(dark.surface).toBe('#111A2E');
    expect(dark.raised).toBe('#1E293B');
    expect(dark.text.primary).toBe('#E2E8F0');
    expect(dark.text.secondary).toBe('#94A3B8');
    expect(dark.border).toBe('#334155');
    expect(dark.primary).toBe('#1E6FE8');
    expect(dark.success).toBe('#1FC9A3');
    const shape = o =>
      Object.keys(o)
        .sort()
        .map(k => (typeof o[k] === 'object' ? [k, shape(o[k])] : k));
    expect(shape(dark)).toEqual(shape(light));
  });
});

describe('ThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useColorScheme.mockReturnValue('light');
  });

  test('defaults to system and follows the color scheme', async () => {
    await mount();
    expect(captured.mode).toBe('system');
    expect(captured.isDark).toBe(false);
    expect(captured.colors).toBe(light);
    useColorScheme.mockReturnValue('dark');
    await mount();
    expect(captured.isDark).toBe(true);
    expect(captured.colors).toBe(dark);
  });

  test('setMode persists and overrides the system scheme', async () => {
    await mount();
    await act(async () => {
      captured.setMode('dark');
    });
    expect(captured.mode).toBe('dark');
    expect(captured.colors).toBe(dark);
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('dark');
  });

  test('restores the stored mode on mount', async () => {
    await AsyncStorage.setItem('@theme_mode', 'dark');
    await mount();
    expect(captured.mode).toBe('dark');
    expect(captured.isDark).toBe(true);
  });

  test('ignores an invalid stored mode', async () => {
    await AsyncStorage.setItem('@theme_mode', 'purple');
    await mount();
    expect(captured.mode).toBe('system');
  });

  test('without a provider falls back to the light palette', () => {
    act(() => {
      ReactTestRenderer.create(<Probe />);
    });
    expect(captured.colors).toBe(light);
    expect(captured.isDark).toBe(false);
  });

  test('useStyles memoizes per palette', async () => {
    const makeStyles = jest.fn(c => ({ box: { backgroundColor: c.background } }));
    let styles;
    const S = () => {
      styles = useStyles(makeStyles);
      return null;
    };
    const el = (
      <ThemeProvider>
        <S />
      </ThemeProvider>
    );
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(el);
    });
    const first = styles;
    await act(async () => {
      tree.update(el);
    });
    expect(styles).toBe(first);
    expect(makeStyles).toHaveBeenCalledTimes(1);
  });
});
