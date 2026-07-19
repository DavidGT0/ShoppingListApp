import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  name: {
    flex: 1,
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '500',
  },
  purchasedText: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 4,
    marginHorizontal: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  editIcon: {
    fontSize: 20,
  },
  deleteIcon: {
    fontSize: 20,
  },
  purchaseButton: {
    backgroundColor: colors.success,
    borderRadius: 6,
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  purchasedButton: {
    backgroundColor: colors.warning,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
