import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from './palettes';

export const THEME_MODE_KEY = '@theme_mode';
const MODES = ['light', 'dark', 'system'];

// בלי ThemeProvider (למשל בבדיקות) מקבלים את הפלטה הבהירה
const fallback = {
  mode: 'light',
  colors: light,
  isDark: false,
  setMode: () => {},
  ready: true,
};

const ThemeContext = createContext(fallback);

export const ThemeProvider = ({ children }) => {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then(stored => {
        if (active && MODES.includes(stored)) setModeState(stored);
      })
      .catch(() => {})
      .then(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(next => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    AsyncStorage.setItem(THEME_MODE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => {
    const isDark = mode === 'dark' || (mode === 'system' && scheme === 'dark');
    return { mode, colors: isDark ? dark : light, isDark, setMode, ready };
  }, [mode, scheme, setMode, ready]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const useStyles = makeStyles => {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [makeStyles, colors]);
};
