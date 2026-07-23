import React from 'react';
import { View, Text } from 'react-native';
import ShoppingListItem from '../ShoppingListItem/ShoppingListItem';
import { styles } from './PurchasedItemsSection.styles';

const PurchasedItemsSection = ({
  items,
  onTogglePurchased,
  onEdit,
  onDelete,
  onUpdateAmount,
}) => {
  // אם אין מוצרים שנקנו, לא מרנדרים כלום
  if (!items || items.length === 0) return null;

  return (
    <View>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>מוצרים שנקנו</Text>
      {items.map(item => (
        <ShoppingListItem
          key={item.id.toString()}
          item={item}
          onTogglePurchased={() => onTogglePurchased(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          onUpdateAmount={newAmount => onUpdateAmount(item, newAmount)}
        />
      ))}
    </View>
  );
};

export default PurchasedItemsSection;
