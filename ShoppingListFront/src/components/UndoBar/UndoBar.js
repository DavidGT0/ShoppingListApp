import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './UndoBar.styles';

// פס תחתון עם הודעה וכפתור "בטל"
const UndoBar = ({ visible, message, onUndo }) => {
  if (!visible) return null;
  return (
    <View style={styles.bar} testID="undo_bar" accessibilityLiveRegion="polite">
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={styles.undoButton}
        onPress={onUndo}
        activeOpacity={0.7}
        testID="undo_button"
        accessibilityRole="button"
        accessibilityLabel="בטל"
      >
        <Text style={styles.undoText}>בטל</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UndoBar;
