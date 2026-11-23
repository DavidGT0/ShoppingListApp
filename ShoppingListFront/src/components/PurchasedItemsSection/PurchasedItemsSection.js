import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import ShoppingListItem from '../ShoppingListItem/ShoppingListItem';
import { makeStyles } from './PurchasedItemsSection.styles';
import { useStyles } from '../../theme/ThemeContext';

const PurchasedItemsSection = ({
  items,
  onTogglePurchased,
  onEdit,
  onDelete,
  onUpdateAmount,
  onRestoreAll,
  onClearAll,
  showAddedBy = false,
  currentUsername = null,
  disabled = false,
  blockIfOffline,
}) => {
  const styles = useStyles(makeStyles);
  // אם אין מוצרים שנקנו, לא מרנדרים כלום
  if (!items || items.length === 0) return null;

  // במצב לא מקוון מציגים את הודעת החסימה במקום חלון האישור
  const confirmRestore = () => {
    if (blockIfOffline && blockIfOffline()) return;
    Alert.alert('החזר הכל לרשימה', 'להחזיר את כל המוצרים שנקנו לרשימה?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'החזר', onPress: () => onRestoreAll && onRestoreAll() },
    ]);
  };

  const confirmClear = () => {
    if (blockIfOffline && blockIfOffline()) return;
    Alert.alert('מחק את מה שנקנה', 'למחוק את כל המוצרים שנקנו?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => onClearAll && onClearAll(),
      },
    ]);
  };

  return (
    <View>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>מוצרים שנקנו</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={confirmRestore}
          testID="restore_all_button"
          accessibilityLabel="החזרת כל המוצרים שנקנו לרשימה"
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>החזר הכל לרשימה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={confirmClear}
          testID="clear_purchased_button"
          accessibilityLabel="מחיקת כל המוצרים שנקנו"
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, styles.actionTextDanger]}>
            מחק את מה שנקנה
          </Text>
        </TouchableOpacity>
      </View>
      {items.map(item => (
        <ShoppingListItem
          key={item.id.toString()}
          item={item}
          onTogglePurchased={() => onTogglePurchased(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          onUpdateAmount={newAmount => onUpdateAmount(item, newAmount)}
          showAddedBy={showAddedBy}
          currentUsername={currentUsername}
          disabled={disabled}
        />
      ))}
    </View>
  );
};

export default PurchasedItemsSection;
