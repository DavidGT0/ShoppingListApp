import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { styles } from './AddItemInput.styles';

const AddItemInput = ({ onAdd }) => {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם מוצר');
      return;
    }
    onAdd(name.trim());
    setName(''); // מנקה את השדה אחרי ההוספה
  };

  return (
    <View style={styles.addContainer}>
      <TextInput
        style={styles.input}
        placeholder="הוסף מוצר חדש..."
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleAdd}
        testID="add_item_input" // <-- מזהה עבור שדה ההקלדה
        accessibilityLabel="add_item_input"
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAdd}
        testID="add_item_button" // <-- מזהה עבור כפתור ההוספה
        accessibilityLabel="add_item_button"
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddItemInput;
