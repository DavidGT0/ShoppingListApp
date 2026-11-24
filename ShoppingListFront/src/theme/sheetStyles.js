// שפת העיצוב המשותפת לחלונות (גיליונות תחתונים): רקע sheet, פינות עליונות מעוגלות,
// ידית אחיזה, צ'יפים בצורת גלולה וכפתורים ראשי/משני כמו במסך ההגדרות
export const SHEET_RADIUS = 28;
export const CHIP_RADIUS = 20;

// גיליון תחתון: ממלא את הרוחב, מעוגל למעלה בלבד, בלי מסגרת
export const sheetContainer = colors => ({
  backgroundColor: colors.sheet,
  width: '100%',
  borderTopLeftRadius: SHEET_RADIUS,
  borderTopRightRadius: SHEET_RADIUS,
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 24,
  shadowColor: colors.shadowBase,
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 12,
});

// הרקע המוחשך מאחורי הגיליון: הגיליון יושב בתחתית
export const sheetOverlay = {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
};

export const sheetHandle = colors => ({
  alignSelf: 'center',
  width: 44,
  height: 5,
  borderRadius: 3,
  backgroundColor: colors.border,
  marginBottom: 14,
});

export const sheetTitle = colors => ({
  fontSize: 20,
  fontWeight: '800',
  marginBottom: 16,
  color: colors.heading,
  textAlign: 'center',
});

export const sheetInput = colors => ({
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  marginBottom: 20,
  color: colors.text.primary,
  textAlign: 'right',
});

// צ'יפ גלולה אחד לקטגוריה, יחידה והצעות
export const chip = colors => ({
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: CHIP_RADIUS,
  paddingHorizontal: 14,
  paddingVertical: 8,
});
export const chipActive = colors => ({
  borderColor: colors.primary,
  backgroundColor: colors.primary,
});
export const chipText = colors => ({
  fontSize: 14,
  fontWeight: '500',
  color: colors.text.primary,
});
export const chipTextActive = colors => ({
  color: colors.text.inverse,
  fontWeight: '700',
});

// כפתור ראשי (מילוי כחול עם צל כחול) וכפתור משני (משטח עם מסגרת דקה)
export const buttonBase = {
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 14,
  alignItems: 'center',
};
export const primaryButton = colors => ({
  ...buttonBase,
  backgroundColor: colors.primary,
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 3,
});
export const secondaryButton = colors => ({
  ...buttonBase,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
});
export const buttonText = colors => ({
  fontSize: 16,
  fontWeight: '700',
  color: colors.text.inverse,
});
export const secondaryButtonText = colors => ({
  fontSize: 16,
  fontWeight: '700',
  color: colors.text.secondary,
});
