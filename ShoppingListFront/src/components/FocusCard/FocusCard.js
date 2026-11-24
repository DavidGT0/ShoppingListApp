import React, { useState } from 'react';
import { View, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { makeStyles } from './FocusCard.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';

// מעבר מכחול לטורקיז (כמו בעיצוב). לבן על הטורקיז הוא 2.1:1 בלבד, ולכן:
// - המעבר אנכי, ונשאר כחול טהור לכל גובה שורת הכותרת ולכל הרוחב (נמדד ב-onLayout);
//   הטורקיז מתחיל רק מתחתיה. לפני המדידה הכרטיס כולו כחול
// - הכותרת נצבעת גם היא בכחול: היא יושבת על כחול זהה, ולכן אין לה קצה נראה
//   (מעבר אלכסוני השאיר את הצד של התג טורקיז-למחצה, ונראה תפר)
// - השורות על primaryDark, והתג בטורקיז עם טקסט כהה
const GRADIENT_START = { x: 0.5, y: 0 };
const GRADIENT_END = { x: 0.5, y: 1 };
// מרווח קטן מתחת לשורת הכותרת לפני שהטורקיז מתחיל
const TITLE_MARGIN = 6;

// כרטיס "עכשיו במחלקה": המחלקה הראשונה בסדר שעוד יש בה מה לקנות, עם שורות גדולות.
// בלי מחלקה (הכל נקנה) מוצג הכרטיס "הכל בעגלה 🎉".
// השורות מצוירות על ידי renderItem של המסך, כך שסימון עובר דרך המסך (חסימה במצב
// לא מקוון, פס ביטול ומשמר השינויים)
const FocusCard = ({ department, renderItem }) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [blue, teal] = colors.focusGradient;
  // גובה הכרטיס ותחתית שורת הכותרת (מתוך onLayout). עדכון רק כשהערך משתנה
  const [size, setSize] = useState({ card: 0, title: 0 });
  const onCardLayout = e => {
    const card = e.nativeEvent.layout.height;
    setSize(prev => (prev.card === card ? prev : { ...prev, card }));
  };
  const onTitleLayout = e => {
    const { y, height } = e.nativeEvent.layout;
    const title = y + height;
    setSize(prev => (prev.title === title ? prev : { ...prev, title }));
  };
  // עד איפה המעבר כחול טהור: תחתית הכותרת ועוד מרווח, ולא יותר מ-1
  const hold =
    size.card > 0 && size.title > 0
      ? Math.min(1, Math.ceil(((size.title + TITLE_MARGIN) / size.card) * 1000) / 1000)
      : 1;

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
      locations={[0, hold, 1]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      onLayout={onCardLayout}
      style={styles.card}
    >
      <View
        testID="focus_card_title_row"
        onLayout={onTitleLayout}
        style={styles.titleRow}
      >
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
