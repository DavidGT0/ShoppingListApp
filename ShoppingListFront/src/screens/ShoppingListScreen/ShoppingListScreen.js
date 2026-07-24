import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// קומפוננטות מופרדות
import ShoppingListItem from '../../components/ShoppingListItem/ShoppingListItem';
import PurchasedItemsSection from '../../components/PurchasedItemsSection/PurchasedItemsSection';
import AddItemInput from '../../components/AddItemInput/AddItemInput';
import EditItemModal from '../../components/EditItemModal/EditItemModal';

// שירותים ועיצובים
import {
  getShoppingList,
  addItem,
  updateItem,
  deleteItem,
  reorderItems,
} from '../../services/api';
import { styles } from './ShoppingListScreen.styles';
import { colors } from '../../theme/colors';

const ShoppingListScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { listId, listName } = route.params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentListId, setCurrentListId] = useState(listId);

  useEffect(() => {
    if (listId) {
      loadListItems(listId);
    }
  }, [listId]);

  const loadListItems = async id => {
    try {
      setLoading(true);
      const data = await getShoppingList(id);
      // מיון המוצרים לפי שדה ה-position כדי לשמור על הסדר הנכון מהשרת
      const sortedData = (data || []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );
      setItems(sortedData);
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את המוצרים לרשימה זו.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async name => {
    if (!currentListId) {
      Alert.alert('שגיאה', 'לא נבחרה רשימה פעילה');
      return;
    }

    const isDuplicate = items.some(
      item => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

    if (isDuplicate) {
      Alert.alert('שים לב', 'המוצר כבר קיים ברשימה');
      return;
    }

    try {
      const newItem = await addItem(name, currentListId, 1);

      const unpurchasedItems = items.filter(item => !item.purchased);
      const purchasedItems = items.filter(item => item.purchased);

      // הכנסת המוצר החדש לראש רשימת הלא-נקונים
      const updatedUnpurchased = [newItem, ...unpurchasedItems];
      setItems([...updatedUnpurchased, ...purchasedItems]);

      // עדכון המיקום (position) בשרת כך שהמוצר החדש יישאר תמיד למעלה גם אחרי רענון
      const reorderedData = updatedUnpurchased.map((item, index) => ({
        id: item.id,
        position: index,
      }));
      await reorderItems(reorderedData);
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

  const handleUpdateAmount = async (item, newAmount) => {
    try {
      const updated = await updateItem(item.id, { amount: newAmount });
      setItems(items.map(i => (i.id === item.id ? updated : i)));
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הכמות');
    }
  };

  const handleEditItem = async newName => {
    if (!editingItem || !newName?.trim()) return;
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

  const handleDragEnd = async ({ data }) => {
    const purchasedItems = items.filter(item => item.purchased);
    setItems([...data, ...purchasedItems]);
    const reorderedData = data.map((item, index) => ({
      id: item.id,
      position: index,
    }));
    try {
      await reorderItems(reorderedData);
    } catch (error) {
      console.log('Failed to save order to server');
    }
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
      {/* 
        שינוי 1: הקטנת הריווח העליון
        שינינו את insets.top + 24 ל- insets.top + 8
        אפשר להקטין עוד אם צריך
      */}
      {/* הורדנו את הרווח העליון, והשארנו רווח תחתון קטן רק כדי לעבור את חלון ההוספה */}
      <View
        style={[
          styles.headerBackground,
          { paddingTop: insets.top + 5, paddingBottom: 40 },
        ]}
      >
        {/* שורה עליונה חדשה המאגדת את הכפתור והכותרת הקטנה */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerEyebrow}>ניהול מוצרים ברשימה</Text>
        </View>

        <Text style={styles.mainTitle} numberOfLines={1}>
          {listName || 'רשימת קניות'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {unpurchasedItems.length > 0
            ? `${unpurchasedItems.length} מוצרים לקנייה`
            : items.length > 0
            ? 'כל המוצרים נקנו 🎉'
            : 'הרשימה עדיין ריקה'}
        </Text>
      </View>

      {/* תיבת ההוספה נשארת קבועה כדי שתמיד יהיה אפשר להוסיף מוצרים */}
      <View style={styles.addCard}>
        <AddItemInput onAdd={handleAddItem} />
      </View>

      <DraggableFlatList
        data={unpurchasedItems}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onDragEnd={handleDragEnd}
        ListHeaderComponent={
          <View>
            <View style={styles.tipContainer}>
              <Text style={styles.tipTitle}>💡 טיפ שימושי:</Text>
              <Text style={styles.tipText}>
                • <Text style={styles.boldText}>סימון כנקנה:</Text> החלק שמאלה.
                {'\n'}• <Text style={styles.boldText}>מחיקת מוצר:</Text> החלק
                ימינה.
              </Text>
            </View>

            {/* הכותרת המקורית של "מוצרים לקנייה" מופיעה מתחת לטיפ במידה ויש מוצרים */}
            {unpurchasedItems.length > 0 && (
              <Text style={styles.sectionLabel}>מוצרים לקנייה</Text>
            )}
          </View>
        }
        renderItem={({ item, drag, isActive }) => (
          <ShoppingListItem
            item={item}
            onTogglePurchased={() => handleTogglePurchased(item)}
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDeleteItem(item.id)}
            onUpdateAmount={newAmount => handleUpdateAmount(item, newAmount)}
            onDrag={drag}
            isActive={isActive}
          />
        )}
        ListFooterComponent={
          <PurchasedItemsSection
            items={purchasedItems}
            onTogglePurchased={handleTogglePurchased}
            onEdit={openEditModal}
            onDelete={handleDeleteItem}
            onUpdateAmount={handleUpdateAmount}
          />
        }
      />

      <EditItemModal
        visible={modalVisible}
        item={editingItem}
        onSave={handleEditItem}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

export default ShoppingListScreen;
