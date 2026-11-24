import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { makeStyles } from './EmojiPicker.styles';
import { useStyles } from '../../theme/ThemeContext';

// סט קבוע של אייקונים לאוכל ולבית, עם מילה בעברית לקורא המסך.
// רק אמוג'י מגרסה 5.0 ומטה: אנדרואיד לפני 10 מציג ריבוע ריק במקום גרסה 11 ומעלה
export const EMOJI_OPTIONS = [
  ['🥦', 'ברוקולי'],
  ['🥕', 'גזר'],
  ['🍎', 'תפוח'],
  ['🍌', 'בננה'],
  ['🍇', 'ענבים'],
  ['🍓', 'תות'],
  ['🥑', 'אבוקדו'],
  ['🍅', 'עגבנייה'],
  ['🥛', 'חלב'],
  ['🧀', 'גבינה'],
  ['🥚', 'ביצה'],
  ['🍞', 'לחם'],
  ['🥖', 'באגט'],
  ['🥐', 'קרואסון'],
  ['🥩', 'בשר'],
  ['🍗', 'עוף'],
  ['🐟', 'דג'],
  ['🥫', 'שימורים'],
  ['🍝', 'פסטה'],
  ['🍚', 'אורז'],
  ['🍯', 'דבש'],
  ['❄️', 'קפואים'],
  ['🍨', 'קינוח'],
  ['🍦', 'גלידה'],
  ['🥤', 'משקה'],
  ['🍵', 'תה'],
  ['☕', 'קפה'],
  ['🍷', 'יין'],
  ['🍺', 'בירה'],
  ['🍫', 'שוקולד'],
  ['🍪', 'עוגייה'],
  ['🍬', 'ממתקים'],
  ['🏠', 'בית'],
  ['💄', 'טיפוח'],
  ['🚽', 'שירותים'],
  ['🛁', 'אמבטיה'],
  ['👕', 'בגדים'],
  ['🍼', 'תינוקות'],
  ['💊', 'תרופות'],
  ['🐾', 'חיות מחמד'],
  ['🌸', 'פרחים'],
  ['🎁', 'מתנות'],
  ['🛒', 'עגלה'],
];

// בחירת אייקון למחלקה. onReset (לא חובה) מחזיר את אייקון ברירת המחדל;
// selected ריק = ברירת המחדל נבחרה, ואז מסומנת האפשרות הזו ולא אמוג'י
const EmojiPicker = ({ visible, selected, onSelect, onReset, onClose }) => {
  const styles = useStyles(makeStyles);
  const defaultSelected = !!onReset && !selected;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet} testID="emoji_picker">
          <View style={styles.handle} testID="sheet_handle" />
          <Text style={styles.title} accessibilityRole="header">
            בחירת אייקון
          </Text>
          <View style={styles.grid}>
            {EMOJI_OPTIONS.map(([emoji, word], index) => {
              const active = emoji === selected;
              return (
                <TouchableOpacity
                  key={emoji}
                  testID={`emoji_option_${index}`}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => onSelect(emoji)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${emoji} ${word}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.actions}>
            {onReset ? (
              <TouchableOpacity
                testID="emoji_default"
                style={[
                  styles.actionButton,
                  defaultSelected && styles.actionButtonActive,
                ]}
                onPress={onReset}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="אייקון ברירת המחדל"
                accessibilityState={{ selected: defaultSelected }}
              >
                <Text style={styles.actionText}>אייקון ברירת המחדל</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              testID="emoji_close"
              style={styles.actionButton}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="סגירה"
            >
              <Text style={styles.actionText}>סגירה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EmojiPicker;
