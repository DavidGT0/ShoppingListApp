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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  /* כותרת עליונה */
  headerBackground: {
    // הרקע הוא מעבר הצבעים (LinearGradient) - colors.headerGradient
    paddingBottom: 44,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerEyebrow: {
    color: colors.onPrimaryMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.inverse,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.onPrimarySoft,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '500',
  },

  /* כרטיס יצירת רשימה - מרחף מעל הכותרת */
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -28,
    padding: 12,
    borderRadius: 20,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'right',
  },
  createButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontSize: 24,
    fontWeight: '700',
    marginTop: -2,
  },

  /* רשימת הרשימות */
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 28,
    marginBottom: 12,
    textAlign: 'right',
  },
  joinLink: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  joinLinkText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 12,
    // כרטיס צף: צל רך, בלי מסגרת
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  listCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    opacity: 0.9,
  },
  listNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    flexShrink: 1,
  },
  sharedBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 6,
  },
  sharedBadgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  actionIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginTop: 40,
    fontSize: 16,
  },

  /* מודאל שינוי שם: גיליון תחתון כמו שאר החלונות */
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
    textAlign: 'right',
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
  cancelButtonText: {
    ...secondaryButtonText(colors),
  },
  saveButton: {
    ...primaryButton(colors),
  },
  saveButtonText: {
    ...buttonText(colors),
  },
});
