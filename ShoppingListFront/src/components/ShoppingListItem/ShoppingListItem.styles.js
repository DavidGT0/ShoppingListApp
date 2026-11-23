import { StyleSheet } from 'react-native';

export const makeStyles = colors => StyleSheet.create({
  // row-reverse כמו שאר המסך: הילד הראשון (העיגול) בצד ימין
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.primary,
    elevation: 10,
    shadowOpacity: 0.2,
  },
  // הרווחים ב-row-reverse: marginLeft של פריט הוא הרווח לפריט שמשמאלו
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
    flexShrink: 0,
  },
  dragHandle: {
    paddingHorizontal: 4,
    marginRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  // השם מקבל את כל הרוחב שנשאר (minWidth: 0 מאפשר לו להתכווץ בלי לדחוף את הפקדים)
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  nameInner: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'right',
  },
  itemMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'right',
  },
  purchasedTextColor: {
    color: colors.text.secondary,
  },
  strikeLine: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -1,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.text.secondary,
  },
  // פקד כמות קומפקטי: לא גדל ולא מתכווץ, ולא לוקח מהשם יותר מהנדרש
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginLeft: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  amountDisabled: {
    opacity: 0.4,
  },
  amountButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    paddingHorizontal: 4,
    minWidth: 16,
    maxWidth: 72,
    textAlign: 'center',
  },
  // הפח: 28dp, ועם hitSlop אזור לחיצה של 44dp
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  // העיגול: 26dp, ועם hitSlop 44dp. marginLeft הוא הרווח לשם שמשמאלו
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  checkCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  // שורה בכרטיס "עכשיו במחלקה": משטח כהה מהצבע הראשי, כדי שהטקסט הלבן יעמוד ב-AA
  focusContainer: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  checkCircleFocus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderColor: colors.text.inverse,
  },
  focusName: {
    fontSize: 17,
    color: colors.text.inverse,
  },
  focusMeta: {
    color: colors.text.inverse,
  },
});
