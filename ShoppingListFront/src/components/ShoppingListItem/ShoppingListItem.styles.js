import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  purchasedContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    shadowOpacity: 0, // מוריד רק את הצל למראה נקי יותר
    elevation: 0,
    // הוסרה השקיפות (opacity) שהייתה כאן!
  },
  activeItem: {
    backgroundColor: colors.surfaceHighlight || '#f0f4f8',
    borderColor: colors.primary,
    elevation: 10,
    shadowOpacity: 0.2,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  dragHandle: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 10,
  },
  nameInner: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  purchasedTextColor: {
    color: colors.text.secondary,
  },
  strikeLine: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -1,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.text.secondary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  amountButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    paddingHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    marginBottom: 12,
    borderRadius: 20,
  },
  swipeActionPurchase: {
    backgroundColor: colors.success || '#22c55e',
  },
  swipeActionDelete: {
    backgroundColor: colors.danger || '#ef4444',
  },
});
