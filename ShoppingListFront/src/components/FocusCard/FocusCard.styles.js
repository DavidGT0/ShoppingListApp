import { StyleSheet } from 'react-native';

// הכרטיס: הצבע הראשי (טקסט לבן עליו 4.67:1). אין ספריית מעברי צבע, ולכן
// הירוק של המעבר מופיע בתג הספירה ובפס בתחתית, לא מתחת לטקסט
export const makeStyles = colors =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingTop: 12,
      paddingBottom: 14,
      marginTop: 4,
      marginBottom: 10,
      overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    accent: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 5,
      backgroundColor: colors.secondary,
    },
    titleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginBottom: 4,
    },
    titleBlock: {
      flex: 1,
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
    doneCard: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 10,
      alignItems: 'center',
      overflow: 'hidden',
      elevation: 4,
    },
    doneText: {
      color: colors.text.inverse,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
