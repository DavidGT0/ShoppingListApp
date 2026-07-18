import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './ShoppingListItem.styles';

const ShoppingListItem = ({ item, onTogglePurchased, onEdit, onDelete }) => {
  const [selected, setSelected] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => setSelected(!selected)}
      >
        <View
          style={[styles.checkboxInner, selected && styles.checkboxSelected]}
        >
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <Text style={[styles.name, item.purchased && styles.purchasedText]}>
        {item.name}
      </Text>

      <View style={styles.actions}>
        {selected && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            item.purchased && styles.purchasedButton,
          ]}
          onPress={onTogglePurchased}
        >
          <Text style={styles.purchaseButtonText}>
            {item.purchased ? '↩️' : '✓'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ShoppingListItem;
