import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    width: '85%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  memberRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
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
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  removeButtonText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: 'bold',
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  primaryButtonText: {
    fontSize: 16,
    color: colors.text.inverse,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  dangerButtonText: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: 'bold',
  },
});
