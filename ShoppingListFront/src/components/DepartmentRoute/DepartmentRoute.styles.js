import { StyleSheet } from 'react-native';

export const PIN_SIZE = 40;
const PIN_RING = 4;
const LINE_WIDTH = 3;
// השורות והכרטיס מוזזים פנימה מעבר לקו המסלול
export const ROW_INDENT = PIN_SIZE + 4;

// כמו שאר המסך: row-reverse ו-right כדי שהמסלול יהיה בצד ימין (תחילת השורה בעברית)
export const makeStyles = colors =>
  StyleSheet.create({
    route: {
      marginTop: 8,
    },
    // קו מקווקו לאורך המסלול, במרכז הסמלים. מלבן צר עם מסגרת מקווקוות בכל
    // הצדדים, כי קו מקווקו בצד אחד בלבד לא מצויר באנדרואיד
    line: {
      position: 'absolute',
      top: PIN_SIZE / 2,
      bottom: 0,
      right: PIN_SIZE / 2 - LINE_WIDTH / 2,
      width: LINE_WIDTH,
      borderWidth: LINE_WIDTH / 2,
      borderStyle: 'dashed',
      borderColor: colors.routeLine,
      borderRadius: 1,
    },
    station: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    // הטבעת בצבע הרקע מסתירה את הקו מאחורי הסמל
    pin: {
      width: PIN_SIZE,
      height: PIN_SIZE,
      borderRadius: PIN_SIZE / 2,
      borderWidth: PIN_RING,
      borderColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pinIcon: {
      fontSize: 17,
      textAlign: 'center',
    },
    stationName: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.text.primary,
      textAlign: 'right',
      marginRight: 8,
    },
    stationNameDone: {
      fontWeight: '600',
    },
    // תג שטוח כמו בעיצוב (בלי מסגרת)
    count: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      backgroundColor: colors.borderLight,
      borderRadius: 8,
      overflow: 'hidden',
      paddingHorizontal: 7,
      paddingVertical: 1,
      marginRight: 8,
    },
    rows: {
      marginRight: ROW_INDENT,
    },
  });
