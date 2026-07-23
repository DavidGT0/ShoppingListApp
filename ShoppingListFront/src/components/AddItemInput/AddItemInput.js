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
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddItemInput;
