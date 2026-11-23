import React from 'react';
import { View, Text } from 'react-native';
import FocusCard from '../FocusCard/FocusCard';
import { makeStyles } from './DepartmentRoute.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { stationTint } from '../../theme/tint';

// כותרת של מחלקה במסלול: סמל עגול, שם ומונה נקנו/סה"כ.
// מחלקה שהכל בה נקנה מתכווצת לשורה הזו בלבד, עם ✓
const Station = ({ station, isFocus, styles }) => {
  const { colors, isDark } = useTheme();
  const { key, name, icon, color, bought, total, complete } = station;
  return (
    <View
      testID={`category_header_${key}`}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${name}, נקנו ${bought} מתוך ${total}`}
      style={styles.station}
    >
      <View
        testID={`department_pin_${key}`}
        style={[
          styles.pin,
          {
            backgroundColor: isFocus
              ? colors.primary
              : stationTint(color, colors, isDark),
          },
        ]}
      >
        <Text style={styles.pinIcon}>{icon}</Text>
      </View>
      <Text
        style={[styles.stationName, complete && styles.stationNameDone]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text testID={`department_count_${key}`} style={styles.count}>
        {`${bought}/${total}${complete ? ' ✓' : ''}`}
      </Text>
    </View>
  );
};

// המסלול של מצב "לפי מחלקות" (plan מגיע מ-buildRoute).
// renderItem(item, { variant }) של המסך מצייר כל שורה, כך שכל הפעולות עוברות דרכו
const DepartmentRoute = ({ plan, renderItem }) => {
  const styles = useStyles(makeStyles);
  if (!plan || !plan.stations || plan.stations.length === 0) return null;
  const { stations, focusKey, allDone } = plan;

  return (
    <View testID="department_route" style={styles.route}>
      <View style={styles.line} pointerEvents="none" />
      {allDone && (
        <View style={styles.rows}>
          <FocusCard department={null} />
        </View>
      )}
      {stations.map(station => {
        const isFocus = station.key === focusKey;
        return (
          <View
            key={station.key}
            testID={
              station.complete
                ? `department_done_${station.key}`
                : `department_${station.key}`
            }
          >
            <Station station={station} isFocus={isFocus} styles={styles} />
            {/* הכרטיס מחליף את השורות של המחלקה הנוכחית (בלי כפילות) */}
            {isFocus ? (
              <View style={styles.rows}>
                <FocusCard department={station} renderItem={renderItem} />
              </View>
            ) : (
              station.items.length > 0 && (
                <View style={styles.rows}>
                  {station.items.map(row => (
                    <React.Fragment key={row.id}>
                      {renderItem(row, {})}
                    </React.Fragment>
                  ))}
                </View>
              )
            )}
          </View>
        );
      })}
    </View>
  );
};

export default DepartmentRoute;
