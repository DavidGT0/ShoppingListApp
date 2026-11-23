import React from 'react';
import { View, Text } from 'react-native';
import { makeStyles } from './FocusCard.styles';
import { useStyles } from '../../theme/ThemeContext';

// כרטיס "עכשיו במחלקה": המחלקה הראשונה בסדר שעוד יש בה מה לקנות, עם שורות גדולות.
// בלי מחלקה (הכל נקנה) מוצג הכרטיס "הכל בעגלה 🎉".
// השורות מצוירות על ידי renderItem של המסך, כך שסימון עובר דרך המסך (חסימה במצב
// לא מקוון, פס ביטול ומשמר השינויים)
const FocusCard = ({ department, renderItem }) => {
  const styles = useStyles(makeStyles);

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
    <View testID="focus_card" style={styles.card}>
      <View style={styles.accent} />
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
    </View>
  );
};

export default FocusCard;
