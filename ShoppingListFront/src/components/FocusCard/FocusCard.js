import React from 'react';
import { View, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { makeStyles } from './FocusCard.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';

// מעבר מכחול לטורקיז (כמו בעיצוב). לבן על הטורקיז הוא 2.1:1 בלבד, ולכן:
// - המעבר מתחיל בפינה הימנית העליונה, שם יושבת הכותרת (row-reverse), ונשאר כחול
//   עד 65% מהדרך; הטורקיז מופיע רק לכיוון הפינה השמאלית התחתונה
// - הכותרת נצבעת בעצמה בקצה הכחול, כך שאין טקסט לבן ישירות על המעבר
// - השורות על primaryDark, והתג בטורקיז עם טקסט כהה
const GRADIENT_START = { x: 1, y: 0 };
const GRADIENT_END = { x: 0, y: 1 };
const GRADIENT_LOCATIONS = [0, 0.65, 1];

// כרטיס "עכשיו במחלקה": המחלקה הראשונה בסדר שעוד יש בה מה לקנות, עם שורות גדולות.
// בלי מחלקה (הכל נקנה) מוצג הכרטיס "הכל בעגלה 🎉".
// השורות מצוירות על ידי renderItem של המסך, כך שסימון עובר דרך המסך (חסימה במצב
// לא מקוון, פס ביטול ומשמר השינויים)
const FocusCard = ({ department, renderItem }) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [blue, teal] = colors.focusGradient;

  if (!department) {
    return (
      <View
        testID="focus_card_done"
        accessible
        accessibilityLabel="הכל בעגלה 🎉"
        accessibilityLiveRegion="polite"
        style={styles.doneCard}
      >
        <Text style={styles.doneText}>הכל בעגלה 🎉</Text>
      </View>
    );
  }

  const items = department.items || [];
  return (
    <LinearGradient
      testID="focus_card"
      colors={[blue, blue, teal]}
      locations={GRADIENT_LOCATIONS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={styles.card}
    >
      <View style={styles.titleRow}>
        {/* רק הכותרת מקובצת לקריאה, כדי שהשורות יישארו נגישות אחת אחת */}
        <View
          testID="focus_card_title"
          accessible
          accessibilityRole="header"
          accessibilityLabel={`עכשיו במחלקה ${department.name}`}
          accessibilityLiveRegion="polite"
          style={styles.titleBlock}
        >
          <Text style={styles.eyebrow}>עכשיו במחלקה</Text>
          <Text style={styles.title} numberOfLines={2}>
            {department.name}
          </Text>
        </View>
        <View style={styles.badge} importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText}>{`${items.length} לקנייה`}</Text>
        </View>
      </View>
      <View style={styles.rows}>
        {items.map(row => (
          <React.Fragment key={row.id}>
            {renderItem ? renderItem(row, { variant: 'focus' }) : null}
          </React.Fragment>
        ))}
      </View>
    </LinearGradient>
  );
};

export default FocusCard;
