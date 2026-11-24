import { StyleSheet } from 'react-native';
import {
  sheetContainer,
  sheetOverlay,
  sheetHandle,
  sheetTitle,
  sheetInput,
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
  },
  sheetHandle: {
    ...sheetHandle(colors),
  },
  modalTitle: {
    ...sheetTitle(colors),
  },
  modalInput: {
    ...sheetInput(colors),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    ...secondaryButton(colors),
  },
  saveButton: {
    ...primaryButton(colors),
  },
  cancelButtonText: {
    ...secondaryButtonText(colors),
  },
  saveButtonText: {
    ...buttonText(colors),
  },
});
