import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  // סרגל קומפקטי: בלי רווח ריק מתחת לשדה (להצעות יש רווח משלהן)
  addContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  addButtonText: {
    color: colors.text.inverse,
    fontSize: 30,
    fontWeight: 'bold',
    lineHeight: 35,
  },
});
