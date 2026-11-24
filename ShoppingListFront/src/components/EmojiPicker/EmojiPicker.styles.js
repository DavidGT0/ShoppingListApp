import { StyleSheet } from 'react-native';

export const makeStyles = colors =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheet: {
      width: '88%',
      backgroundColor: colors.raised,
      borderRadius: 20,
      padding: 16,
      shadowColor: colors.shadowBase,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'right',
      marginBottom: 12,
    },
    grid: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    // 44dp לפחות לכל אייקון
    option: {
      width: 48,
      height: 48,
      margin: 2,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
    },
    emoji: {
      fontSize: 26,
    },
    actions: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: 8,
    },
    actionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    // ברירת המחדל נבחרה: מסגרת בצבע הראשי, כמו אמוג'י נבחר
    actionButtonActive: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
    },
    actionText: {
      color: colors.primaryText,
      fontSize: 15,
      fontWeight: '700',
    },
  });
