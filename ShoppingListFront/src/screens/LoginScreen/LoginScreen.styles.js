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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  // פס כותרת עם מעבר הצבעים של האפליקציה מאחורי הלוגו, פורש על כל רוחב המסך
  logoContainer: {
    alignItems: 'center',
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 28,
    paddingTop: 56,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.onPrimarySoft,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  switchButtonText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  securityInfo: {
    marginTop: 32,
    alignItems: 'center',
  },
  securityText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  slowServerNote: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
  },
  // שכחתי סיסמה
  forgotButton: {
    alignSelf: 'center',
    marginTop: 14,
    padding: 6,
  },
  forgotButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // חלון איפוס הסיסמה: גיליון תחתון כמו שאר החלונות
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
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
  },
  modalCancelButton: {
    ...secondaryButton(colors),
  },
  modalCancelText: {
    ...secondaryButtonText(colors),
  },
  modalSendButton: {
    ...primaryButton(colors),
  },
  modalSendText: {
    ...buttonText(colors),
  },
});
