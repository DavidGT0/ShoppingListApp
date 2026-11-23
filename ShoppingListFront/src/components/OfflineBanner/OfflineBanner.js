import React, { useEffect } from 'react';
import { View, Text, Alert, AccessibilityInfo } from 'react-native';
import { styles } from './OfflineBanner.styles';

export const OFFLINE_BANNER_TEXT =
  'אין חיבור לאינטרנט — מוצגת הגרסה האחרונה שנשמרה';

// ההודעה שמוצגת כשמנסים לערוך בלי חיבור
export const showOfflineBlockedAlert = () =>
  Alert.alert('אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור');

const OfflineBanner = ({ visible }) => {
  // הכרזה אחת בכל הופעה של הבאנר (אזור חי שנטען עם הטקסט לא תמיד מוכרז)
  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(OFFLINE_BANNER_TEXT);
  }, [visible]);
  if (!visible) return null;
  return (
    <View
      style={styles.banner}
      testID="offline_banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{OFFLINE_BANNER_TEXT}</Text>
    </View>
  );
};

export default OfflineBanner;
