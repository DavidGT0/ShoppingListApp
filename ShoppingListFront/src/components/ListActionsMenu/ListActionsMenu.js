import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { styles } from './ListActionsMenu.styles';

// תפריט פעולות לרשימה. הבעלים רואה הכול; חבר רואה רק שכפול ושליחה כטקסט
const ListActionsMenu = ({
  visible,
  list,
  onClose,
  onRename,
  onDuplicate,
  onShareText,
  onDelete,
}) => {
  if (!list) return null;
  const isOwner = list.is_owner !== false;

  const option = (testID, label, handler, destructive) => (
    <TouchableOpacity
      style={styles.option}
      onPress={() => handler(list)}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={[styles.optionText, destructive && styles.destructiveText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        testID="list_menu_overlay"
        accessibilityRole="button"
        accessibilityLabel="סגור תפריט"
      >
        <View style={styles.sheet}>
          <Text style={styles.title} numberOfLines={1}>
            {list.name}
          </Text>
          {isOwner && option('menu_rename', 'שינוי שם', onRename)}
          {option('menu_duplicate', 'שכפול רשימה', onDuplicate)}
          {option('menu_share_text', 'שליחה כטקסט', onShareText)}
          {isOwner && option('menu_delete', 'מחיקה', onDelete, true)}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default ListActionsMenu;
