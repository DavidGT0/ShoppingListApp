import { StyleSheet } from 'react-native';

// הכרטיס הוא מעבר צבעים (FocusCard.js). כל טקסט בו יושב על משטח אטום משלו
export const makeStyles = colors =>
  StyleSheet.create({
    card: {
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingTop: 12,
      paddingBottom: 12,
      marginTop: 4,
      marginBottom: 10,
    },
    titleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginBottom: 4,
    },
    // נצבע בקצה הכחול של המעבר: בלתי נראה (המעבר כחול כאן), ומבטיח AA לכותרת
    titleBlock: {
      flex: 1,
      backgroundColor: colors.focusGradient[0],
    },
    eyebrow: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'right',
    },
    title: {
      color: colors.text.inverse,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'right',
    },
    badge: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginRight: 8,
    },
    badgeText: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: '800',
    },
    rows: {
      marginTop: 4,
    },
    // "הכל בעגלה": טורקיז עם טקסט כהה (9:1)
    doneCard: {
      backgroundColor: colors.secondary,
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 10,
      alignItems: 'center',
    },
    doneText: {
      color: colors.navy,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
