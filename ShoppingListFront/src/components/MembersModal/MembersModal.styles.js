import { StyleSheet } from 'react-native';
import {
  sheetContainer,
  sheetOverlay,
  sheetHandle,
  sheetTitle,
  primaryButton,
  secondaryButton,
  buttonText,
  secondaryButtonText,
} from '../../theme/sheetStyles';

export const makeStyles = colors => StyleSheet.create({
  modalOverlay: {
    ...sheetOverlay,
  },
  modalContent: {
    ...sheetContainer(colors),
    maxHeight: '85%',
  },
  sheetHandle: {
    ...sheetHandle(colors),
  },
  modalTitle: {
    ...sheetTitle(colors),
  },
  // שורת משתתף: כרטיס רך בלי מסגרת, כמו כרטיסי הרשימה
  memberRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  memberName: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'right',
    flexShrink: 1,
  },
  ownerTag: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dangerText,
  },
  removeButtonText: {
    fontSize: 14,
    color: colors.dangerText,
    fontWeight: 'bold',
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  modalButton: {
    alignItems: 'center',
  },
  primaryButton: {
    ...primaryButton(colors),
  },
  secondaryButton: {
    ...secondaryButton(colors),
  },
  dangerButton: {
    ...secondaryButton(colors),
    borderWidth: 1.5,
    borderColor: colors.dangerText,
  },
  primaryButtonText: {
    ...buttonText(colors),
  },
  secondaryButtonText: {
    ...secondaryButtonText(colors),
  },
  dangerButtonText: {
    ...buttonText(colors),
    color: colors.dangerText,
  },
});
