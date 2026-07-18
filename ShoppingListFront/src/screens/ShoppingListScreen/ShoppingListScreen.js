import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import ShoppingListItem from '../../components/ShoppingListItem/ShoppingListItem';
import {
  getShoppingList,
  addItem,
  updateItem,
  deleteItem,
} from '../../services/api';
import { styles } from './ShoppingListScreen.styles';
import { colors } from '../../theme/colors';

const ShoppingListScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getShoppingList();
      setItems(data);
    } catch (error) {
      console.log('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם מוצר');
      return;
    }

    try {
      const newItem = await addItem(newItemName);
      setItems([...items, newItem]);
      setNewItemName('');
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף את המוצר');
    }
  };

  const handleTogglePurchased = async item => {
    try {
      const updated = await updateItem(item.id, { purchased: !item.purchased });
      setItems(items.map(i => (i.id === item.id ? updated : i)));
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את המוצר');
    }
  };

  const handleEditItem = async newName => {
    if (!editingItem || !newName.trim()) return;

    try {
      const updated = await updateItem(editingItem.id, { name: newName });
      setItems(items.map(i => (i.id === editingItem.id ? updated : i)));
      setEditingItem(null);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לערוך את המוצר');
    }
  };

  const handleDeleteItem = async itemId => {
    Alert.alert('מחיקת מוצר', 'האם אתה בטוח שברצונך למחוק מוצר זה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(itemId);
            setItems(items.filter(i => i.id !== itemId));
          } catch (error) {
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את המוצר');
          }
        },
      },
    ]);
  };

  const openEditModal = item => {
    setEditingItem(item);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unpurchasedItems = items.filter(item => !item.purchased);
  const purchasedItems = items.filter(item => item.purchased);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>רשימת הקניות שלי</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addContainer}>
        <TextInput
          style={styles.input}
          placeholder="הוסף מוצר חדש..."
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={unpurchasedItems}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <ShoppingListItem
            item={item}
            onTogglePurchased={() => handleTogglePurchased(item)}
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDeleteItem(item.id)}
          />
        )}
      />

      {purchasedItems.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>מוצרים שנקנו</Text>
          <FlatList
            data={purchasedItems}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <ShoppingListItem
                item={item}
                onTogglePurchased={() => handleTogglePurchased(item)}
                onEdit={() => openEditModal(item)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )}
          />
        </>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ערוך מוצר</Text>
            <TextInput
              style={styles.modalInput}
              defaultValue={editingItem?.name}
              onChangeText={text =>
                setEditingItem({ ...editingItem, name: text })
              }
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => handleEditItem(editingItem?.name)}
              >
                <Text style={styles.saveButtonText}>שמור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ShoppingListScreen;
