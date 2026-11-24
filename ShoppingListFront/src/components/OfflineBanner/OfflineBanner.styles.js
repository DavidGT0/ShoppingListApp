import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  // גלולה אמבר רכה עם צל, כמו שאר הכרטיסים
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: 9,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  text: {
    color: colors.onWarning,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
