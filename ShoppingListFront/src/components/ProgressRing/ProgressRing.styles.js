import { StyleSheet } from 'react-native';

export const RING_SIZE = 60;
export const RING_THICKNESS = 7;
const HALF = RING_SIZE / 2;
const HOLE = RING_SIZE - RING_THICKNESS * 2;

// הטבעת בנויה משני חצאים חתוכים: בכל חצי מסתובב ריבוע בגודל הטבעת שחציו צבוע.
// direction: 'ltr' שומר על הגאומטריה (שמאל/ימין) קבועה גם כשהאפליקציה מימין לשמאל
export const makeStyles = colors =>
  StyleSheet.create({
    ring: {
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: HALF,
      overflow: 'hidden',
      backgroundColor: colors.onPrimarySubtle,
      direction: 'ltr',
    },
    // החצי הימני: מתמלא ראשון, מהשעה 12 עם כיוון השעון
    clipRight: {
      position: 'absolute',
      top: 0,
      left: HALF,
      width: HALF,
      height: RING_SIZE,
      overflow: 'hidden',
    },
    rotorRight: {
      position: 'absolute',
      top: 0,
      left: -HALF,
      width: RING_SIZE,
      height: RING_SIZE,
    },
    // החצי השמאלי: מתמלא אחרי חצי, מהשעה 6
    clipLeft: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: HALF,
      height: RING_SIZE,
      overflow: 'hidden',
    },
    rotorLeft: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: RING_SIZE,
      height: RING_SIZE,
    },
    fillLeftHalf: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: HALF,
      height: RING_SIZE,
      backgroundColor: colors.secondary,
    },
    fillRightHalf: {
      position: 'absolute',
      top: 0,
      left: HALF,
      width: HALF,
      height: RING_SIZE,
      backgroundColor: colors.secondary,
    },
    hole: {
      position: 'absolute',
      top: RING_THICKNESS,
      left: RING_THICKNESS,
      width: HOLE,
      height: HOLE,
      borderRadius: HOLE / 2,
      backgroundColor: colors.primaryDark,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
    },
    label: {
      color: colors.text.inverse,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
