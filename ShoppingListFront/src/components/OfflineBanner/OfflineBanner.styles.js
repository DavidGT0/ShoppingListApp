import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  text: {
    color: colors.text.primary,
    fontSize: 13,
    textAlign: 'center',
  },
});
