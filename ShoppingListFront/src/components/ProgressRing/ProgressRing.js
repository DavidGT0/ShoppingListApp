import React from 'react';
import { View, Text } from 'react-native';
import { makeStyles } from './ProgressRing.styles';
import { useStyles } from '../../theme/ThemeContext';

// טבעת התקדמות: כמה נקנו מתוך הכל. רק Views (אין ספריית svg): שני חצאים
// שכל אחד מהם מסתובב עד 180 מעלות
const ProgressRing = ({ done = 0, total = 0 }) => {
  const styles = useStyles(makeStyles);
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeDone = Math.min(Math.max(0, Number(done) || 0), safeTotal);
  // רשימה ריקה (0/0) היא טבעת ריקה, בלי חלוקה באפס
  const fraction = safeTotal > 0 ? safeDone / safeTotal : 0;
  const first = Math.round(Math.min(fraction, 0.5) * 360);
  const second = Math.round(Math.max(fraction - 0.5, 0) * 360);

  return (
    <View
      testID="progress_ring"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`נקנו ${done} מתוך ${total}`}
      accessibilityValue={{ min: 0, max: safeTotal, now: safeDone }}
      style={styles.ring}
    >
      <View style={styles.clipRight}>
        <View
          testID="progress_ring_first"
          style={[styles.rotorRight, { transform: [{ rotate: `${first}deg` }] }]}
        >
          <View style={styles.fillLeftHalf} />
        </View>
      </View>
      <View style={styles.clipLeft}>
        <View
          testID="progress_ring_second"
          style={[styles.rotorLeft, { transform: [{ rotate: `${second}deg` }] }]}
        >
          <View style={styles.fillRightHalf} />
        </View>
      </View>
      <View style={styles.hole}>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
          {`${done}/${total}`}
        </Text>
      </View>
    </View>
  );
};

export default ProgressRing;
