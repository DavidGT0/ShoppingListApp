import { StyleSheet } from 'react-native';

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

  /* כותרת עליונה מעוצבת */
  headerBackground: {
    backgroundColor: colors.primary,
    paddingBottom: 44,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // דוחף את הכפתור שמאלה ואת הטקסט ימינה
    alignItems: 'center', // ממורכז אותם לאותו קו גובה בדיוק
    width: '100%',
    marginBottom: 0, // רווח קל לפני שם הרשימה הגדול
  },
  backButton: {
    width: 44, // גודל קבוע כדי ליצור ריבוע/מלבן מדויק
    height: 44,
    backgroundColor: colors.onPrimarySubtle,
    borderRadius: 12,
    justifyContent: 'center', // מרכוז אנכי של החץ בתוך הכפתור
    alignItems: 'center', // מרכוז אופקי של החץ בתוך הכפתור
  },
  backButtonText: {
    color: colors.text.inverse,
    fontSize: 28, // הגדלנו את החץ
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -4, // תיקון אופטי קטן: לתווי טקסט של חצים יש לרוב רווח תחתון מובנה, זה ממקם אותו בול באמצע
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggle: {
    width: 44,
    height: 44,
    backgroundColor: colors.onPrimarySubtle,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: colors.onPrimarySubtle,
    borderRadius: 12,
  },
  membersButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerEyebrow: {
    color: colors.onPrimaryMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  // טבעת ההתקדמות בצד ימין ולצידה שם הרשימה והשורה שמתחתיו
  headerMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  headerTexts: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.inverse,
    textAlign: 'right',
    letterSpacing: -0.5,
    marginTop: -4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.onPrimarySoft,
    textAlign: 'right',
    marginTop: 0,
    fontWeight: '500',
  },

  /* כרטיס הוספה - מרחף מעל הכותרת */
  addCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -28,
    padding: 8,
    borderRadius: 16,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  /* רשימת המוצרים */
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'right',
  },
  sortSegments: {
    flexDirection: 'row-reverse',
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sortSegment: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  sortSegmentActive: {
    backgroundColor: colors.primary,
  },
  sortSegmentText: {
    fontSize: 14,
    marginRight: 6,
    color: colors.primaryText,
    fontWeight: '600',
  },
  sortSegmentTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 380,
  },
  // המסלול צמוד יותר לקצוות (כמו בעיצוב), כדי להשאיר לשמות המוצרים רוחב
  routeContent: {
    paddingHorizontal: 14,
  },

  /* מודאל עריכה */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.raised,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text.primary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 24,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontSize: 17,
    fontWeight: '700',
  },
});
