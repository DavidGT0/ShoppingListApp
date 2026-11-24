import React, { useEffect } from 'react';
import { View, Text, Alert, AccessibilityInfo } from 'react-native';
import { makeStyles } from './OfflineBanner.styles';
import { useStyles } from '../../theme/ThemeContext';

export const OFFLINE_BANNER_TEXT =
  'אין חיבור לאינטרנט — מוצגת הגרסה האחרונה שנשמרה';
// השרת (Render, גרסה חינמית) מתעורר עד כחצי דקה: הרשת תקינה, רק הבקשה הראשונה איטית
export const SLOW_BANNER_TEXT = 'השרת מתעורר — מוצגת הגרסה האחרונה שנשמרה';

// ההסבר לקורא המסך על פקד שאי אפשר להשתמש בו עכשיו
export const OFFLINE_HINT = 'לא זמין ללא חיבור לאינטרנט';
export const SLOW_HINT = 'השרת מתעורר, נסה שוב בעוד רגע';

// ההודעה שמוצגת כשמנסים לערוך בלי חיבור
export const showOfflineBlockedAlert = () =>
  Alert.alert('אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור');

// ההודעה שמוצגת כשמנסים לערוך בזמן שהשרת עוד מתעורר
export const showSlowBlockedAlert = () =>
  Alert.alert('השרת עוד מתעורר', 'אפשר יהיה לערוך בעוד כמה שניות');

// מצב החיבור של מסך: 'online', 'slow' (השרת מתעורר) או 'offline' (שגיאת רשת)
export const showBlockedAlertFor = connection =>
  connection === 'slow' ? showSlowBlockedAlert() : showOfflineBlockedAlert();
export const unavailableHint = connection =>
  connection === 'slow'
    ? SLOW_HINT
    : connection === 'offline'
    ? OFFLINE_HINT
    : undefined;

// slow: השרת מתעורר (באנר רגוע יותר, בלי "אין חיבור")
const OfflineBanner = ({ visible, slow = false }) => {
  const styles = useStyles(makeStyles);
  const text = slow ? SLOW_BANNER_TEXT : OFFLINE_BANNER_TEXT;
  // הכרזה אחת בכל הופעה של הבאנר (אזור חי שנטען עם הטקסט לא תמיד מוכרז)
  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(text);
  }, [visible, text]);
  if (!visible) return null;
  return (
    <View
      style={[styles.banner, slow && styles.bannerSlow]}
      testID={slow ? 'slow_banner' : 'offline_banner'}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.text, slow && styles.textSlow]}>{text}</Text>
    </View>
  );
};

export default OfflineBanner;
