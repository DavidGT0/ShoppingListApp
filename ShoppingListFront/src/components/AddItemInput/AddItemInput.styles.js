import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  addContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -10,
    marginBottom: 12,
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
