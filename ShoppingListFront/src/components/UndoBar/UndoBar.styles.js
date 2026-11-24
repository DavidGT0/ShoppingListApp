import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  // פס צף מעוגל כמו שורת ההוספה של הרשימה
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.snackbar,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    flex: 1,
    color: colors.onSnackbar,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  undoText: {
    color: colors.snackbarAction,
    fontSize: 15,
    fontWeight: '800',
  },
});
