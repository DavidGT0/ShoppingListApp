import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.snackbar,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 6,
  },
  message: {
    flex: 1,
    color: colors.onSnackbar,
    fontSize: 15,
    textAlign: 'right',
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  undoText: {
    color: colors.snackbarAction,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
