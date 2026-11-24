import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { makeStyles } from './EmojiPicker.styles';
import { useStyles } from '../../theme/ThemeContext';

// סט קבוע של אייקונים לאוכל ולבית, עם מילה בעברית לקורא המסך
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
  ['🧂', 'תבלינים'],
  ['🧊', 'קפואים'],
  ['❄️', 'שלג'],
  ['🍦', 'גלידה'],
  ['🥤', 'משקה'],
  ['🧃', 'מיץ'],
  ['☕', 'קפה'],
  ['🍷', 'יין'],
  ['🍺', 'בירה'],
  ['🍫', 'שוקולד'],
  ['🍪', 'עוגייה'],
  ['🍬', 'ממתקים'],
  ['🧽', 'ספוג'],
  ['🧴', 'תכשיר'],
  ['🧻', 'נייר'],
  ['🧼', 'סבון'],
  ['🧺', 'כביסה'],
  ['🍼', 'תינוקות'],
  ['💊', 'תרופות'],
  ['🐾', 'חיות מחמד'],
  ['🌸', 'פרחים'],
  ['🎁', 'מתנות'],
  ['🛒', 'עגלה'],
];

// בחירת אייקון למחלקה. onReset (לא חובה) מחזיר את אייקון ברירת המחדל
const EmojiPicker = ({ visible, selected, onSelect, onReset, onClose }) => {
  const styles = useStyles(makeStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet} testID="emoji_picker">
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
                style={styles.actionButton}
                onPress={onReset}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="אייקון ברירת המחדל"
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
