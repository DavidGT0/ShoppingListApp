import { StyleSheet } from 'react-native';

export const makeStyles = colors =>
  StyleSheet.create({
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

    /* כותרת במעבר צבעים, כמו במסך הרשימה */
    header: {
      paddingHorizontal: 24,
      paddingBottom: 22,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      width: 44,
      height: 44,
      backgroundColor: colors.onPrimarySubtle,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonText: {
      color: colors.text.inverse,
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: -4,
    },
    // כפתור גלולה בכותרת
    doneButton: {
      minWidth: 88,
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 22,
      backgroundColor: colors.onPrimarySubtle,
      borderWidth: 1,
      borderColor: colors.onPrimaryMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    doneText: {
      color: colors.text.inverse,
      fontSize: 16,
      fontWeight: '800',
    },
    headerEyebrow: {
      color: colors.onPrimaryMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
      marginTop: 10,
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text.inverse,
      textAlign: 'right',
      letterSpacing: -0.5,
      marginTop: 2,
    },

    /* הרשימה */
    listContainer: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 120,
    },
    hint: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.text.secondary,
      textAlign: 'right',
      paddingHorizontal: 4,
      paddingTop: 12,
      paddingBottom: 6,
    },
    // שורת מחלקה: כרטיס כמו כרטיסי הרשימות. row-reverse כמו שאר האפליקציה:
    // הילד הראשון (הידית) בצד ימין
    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: colors.shadow.dark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    // השורה הנגררת "מורמת" ומסומנת בצבע הראשי
    rowActive: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
      elevation: 10,
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    rowEditing: {
      borderColor: colors.primary,
    },
    handle: {
      width: 32,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // מקום ריק במקום הידית בשורה הנעוצה ("אחר"), כדי שהאייקונים יישארו בקו אחד
    handleSpacer: {
      width: 32,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: 22,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    nameArea: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      justifyContent: 'center',
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      textAlign: 'right',
    },
    pinnedText: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: 'right',
      marginTop: 2,
    },
    nameInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 16,
      color: colors.text.primary,
      backgroundColor: colors.background,
      textAlign: 'right',
    },
    roundButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editHint: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: 'right',
      paddingHorizontal: 8,
      paddingTop: 4,
    },

    /* הוספת מחלקה */
    addButton: {
      marginTop: 12,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonText: {
      color: colors.primaryText,
      fontSize: 16,
      fontWeight: '700',
    },
    addRow: {
      marginTop: 12,
      borderColor: colors.primary,
    },
    addSave: {
      minWidth: 64,
      height: 44,
      paddingHorizontal: 14,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addSaveText: {
      color: colors.text.inverse,
      fontSize: 15,
      fontWeight: '700',
    },
  });
