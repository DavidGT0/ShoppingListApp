import { StyleSheet } from 'react-native';
import {
  sheetContainer,
  sheetOverlay,
  sheetHandle,
  sheetTitle,
  sheetInput,
  chip,
  chipActive,
  chipText,
  chipTextActive,
  primaryButton,
  secondaryButton,
  buttonText,
  secondaryButtonText,
} from '../../theme/sheetStyles';

export const makeStyles = colors => StyleSheet.create({
  modalOverlay: {
    ...sheetOverlay,
  },
  outerScroll: {
    width: '100%',
  },
  // הגיליון נדבק לתחתית; כשהתוכן גבוה מהמסך אפשר לגלול
  outerScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  chipsScroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    ...chip(colors),
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  chipActive: {
    ...chipActive(colors),
  },
  chipNew: {
    borderStyle: 'dashed',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 6,
  },
  chipIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  chipText: {
    ...chipText(colors),
  },
  chipTextActive: {
    ...chipTextActive(colors),
  },
  newCategoryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  newCategoryInput: {
    flex: 1,
    marginBottom: 0,
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
