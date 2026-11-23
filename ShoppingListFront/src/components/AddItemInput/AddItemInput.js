import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { getSuggestions } from '../../services/api';
import { styles } from './AddItemInput.styles';

const DEBOUNCE_MS = 250;
const MAX_CHIPS = 5;

const AddItemInput = ({ onAdd, listId, editable = true }) => {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  // מספר השאילתה האחרונה - תשובה של שאילתה ישנה יותר נזרקת
  const queryId = useRef(0);

  useEffect(() => {
    const query = name.trim();
    const id = ++queryId.current;
    if (!query || !listId || !editable) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await getSuggestions(query, listId);
        if (id === queryId.current && Array.isArray(result)) {
          setSuggestions(result.slice(0, MAX_CHIPS));
        }
      } catch (error) {
        // שקט - פשוט אין הצעות
        if (id === queryId.current) setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [name, listId, editable]);

  const handleChip = chipName => {
    onAdd(chipName);
    setName('');
  };

  const handleAdd = () => {
    if (!editable) {
      // במצב לא מקוון ההורה מציג את ההודעה (ולא "אנא הזן שם מוצר")
      onAdd(name.trim());
      return;
    }
    if (!name.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם מוצר');
      return;
    }
    onAdd(name.trim());
    setName(''); // מנקה את השדה אחרי ההוספה
  };

  return (
    <View>
      <View style={styles.addContainer}>
      <TextInput
        style={styles.input}
        placeholder="הוסף מוצר חדש..."
        value={name}
        editable={editable}
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
      {editable && suggestions.length > 0 && (
        <View style={styles.chipsRow}>
          {suggestions.map((chip, index) => (
            <TouchableOpacity
              key={chip}
              style={styles.chip}
              onPress={() => handleChip(chip)}
              testID={`suggestion_chip_${index}`}
              accessibilityLabel={chip}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default AddItemInput;
