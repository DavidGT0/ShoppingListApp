import { StyleSheet } from 'react-native';
import {
  sheetContainer,
  sheetOverlay,
  sheetHandle,
} from '../../theme/sheetStyles';

export const makeStyles = colors => StyleSheet.create({
  overlay: {
    ...sheetOverlay,
  },
  sheet: {
    ...sheetContainer(colors),
    paddingHorizontal: 8,
  },
  sheetHandle: {
    ...sheetHandle(colors),
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.heading,
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'right',
  },
  destructiveText: {
    color: colors.dangerText,
    fontWeight: '700',
  },
});
