import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.sheet,
    width: '75%',
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 17,
    color: colors.text.primary,
    textAlign: 'right',
  },
  destructiveText: {
    color: colors.dangerText,
  },
});
