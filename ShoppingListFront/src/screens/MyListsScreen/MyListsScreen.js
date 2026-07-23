import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getShoppingLists,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
} from '../../services/api';
import { styles } from './MyListsScreen.styles';
import { colors } from '../../theme/colors';

const MyListsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');

  // מצבים לניהול מודאל עריכת שם רשימה
  const [editingList, setEditingList] = useState(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newNameValue, setNewNameValue] = useState('');

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const data = await getShoppingLists();
      setLists(data || []);
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את הרשימות שלך.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם לרשימה החדשה');
      return;
    }

    try {
      const newList = await createShoppingList(newListName.trim());
      setLists(prev => [...prev, newList]);
      setNewListName(''); // מנקה את האינבוקס אחרי ההוספה
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו ליצור רשימה חדשה');
    }
  };

  const handleDeleteList = listId => {
    Alert.alert('מחיקת רשימה', 'האם אתה בטוח שברצונך למחוק רשימה זו?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteShoppingList(listId);
            setLists(lists.filter(l => l.id !== listId));
          } catch (error) {
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את הרשימה');
          }
        },
      },
    ]);
  };

  const openRenameModal = list => {
    setEditingList(list);
    setNewNameValue(list.name);
    setRenameModalVisible(true);
  };

  const handleRenameList = async () => {
    if (!editingList || !newNameValue.trim()) return;

    try {
      const updated = await updateShoppingList(editingList.id, {
        name: newNameValue.trim(),
      });
      setLists(
        lists.map(l =>
          l.id === editingList.id
            ? updated || { ...l, name: newNameValue.trim() }
            : l,
        ),
      );
      setRenameModalVisible(false);
      setEditingList(null);
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את שם הרשימה');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* כותרת עליונה מעוצבת */}
      <View style={[styles.headerBackground, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.headerEyebrow}>ניהול קניות חכם</Text>
        <Text style={styles.mainTitle}>הרשימות שלי</Text>
        <Text style={styles.headerSubtitle}>
          {lists.length > 0
            ? `${lists.length} רשימות פעילות`
            : 'בואו ניצור את הרשימה הראשונה'}
        </Text>
      </View>

      {/* כרטיס יצירת רשימה - "מרחף" מעל הכותרת */}
      <View style={styles.createCard}>
        <TextInput
          style={styles.input}
          placeholder="שם רשימה חדשה..."
          value={newListName}
          onChangeText={setNewListName}
          placeholderTextColor={colors.text.secondary}
        />
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateList}
          activeOpacity={0.85}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          lists.length > 0 ? (
            <Text style={styles.sectionLabel}>הרשימות שלך</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.listItemCard}>
            <TouchableOpacity
              style={styles.listCardContent}
              onPress={() =>
                navigation.navigate('ShoppingListItems', {
                  listId: item.id,
                  listName: item.name,
                })
              }
            >
              <Text style={styles.listNameText}>{item.name}</Text>
            </TouchableOpacity>

            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => openRenameModal(item)}
                style={styles.actionIconBtn}
              >
                <Text style={{ fontSize: 18 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteList(item.id)}
                style={styles.actionIconBtn}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            אין עדיין רשימות. צור רשימה חדשה למעלה!
          </Text>
        }
      />

      {/* מודאל שינוי שם רשימה */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>שינוי שם רשימה</Text>
            <TextInput
              style={styles.modalInput}
              value={newNameValue}
              onChangeText={setNewNameValue}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleRenameList}
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

export default MyListsScreen;
