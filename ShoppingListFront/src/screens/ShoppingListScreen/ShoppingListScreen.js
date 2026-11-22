import React, { useState, useEffect, useRef } from 'react';
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
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { styles } from './ShoppingListScreen.styles';
import { colors } from '../../theme/colors';

const LIVE_REFRESH_MS = 3000;

// מיון המוצרים לפי שדה ה-position כדי לשמור על הסדר הנכון מהשרת
const sortByPosition = data =>
  (data || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const ShoppingListScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  // isOwner ישמש את חלון המשתתפים (משימה 8)
  // eslint-disable-next-line no-unused-vars
  const { listId, listName, isOwner = true } = route.params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentListId = listId;
  // עולה בתחילת כל פעולה שלי ובסופה - רענון שהתחיל לפני שינוי שלי נזרק
  const mutationVersion = useRef(0);
  // מספר פעולות שלי שעדיין בדרך - רענון שחוזר בזמן הזה נזרק
  const pendingMutations = useRef(0);
  const lostAccessHandled = useRef(false);
  const startMutation = () => {
    mutationVersion.current++;
    pendingMutations.current++;
  };
  const endMutation = () => {
    mutationVersion.current++;
    pendingMutations.current--;
  };

  useEffect(() => {
    if (listId) {
      loadListItems(listId);
    }
  }, [listId]);

  const loadListItems = async id => {
    try {
      setLoading(true);
      const data = await getShoppingList(id);
      setItems(sortByPosition(data));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את המוצרים לרשימה זו.');
    } finally {
      setLoading(false);
    }
  };

  // רענון חי: מביא את המצב העדכני מהשרת (שינויים של בני משפחה אחרים)
  const refreshItems = async () => {
    if (!listId) return;
    const version = mutationVersion.current;
    try {
      const data = await getShoppingList(listId);
      // פעולה שלי בדרך, או שבוצע שינוי שלי בינתיים - התשובה ישנה
      if (pendingMutations.current > 0 || version !== mutationVersion.current) {
        return;
      }
      setItems(sortByPosition(data));
    } catch (error) {
      if (error.sessionExpired) return; // האפליקציה כבר מטפלת בזה
      if (error.status === 403 || error.status === 404) {
        if (lostAccessHandled.current) return;
        lostAccessHandled.current = true;
        Alert.alert('שים לב', 'אין לך יותר גישה לרשימה הזו');
        navigation.goBack();
      }
      // שגיאות אחרות (רשת וכו') - שקט, המוצרים הנוכחיים נשארים
    }
  };

  useLiveRefresh(refreshItems, LIVE_REFRESH_MS, { paused: isDragging });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshItems();
    } finally {
      setRefreshing(false);
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

    startMutation();
    try {
      const newItem = await addItem(name, currentListId, 1);

      // הכנסת המוצר החדש לראש רשימת הלא-נקונים.
      // (השרת עצמו שומר מוצר חדש בראש הרשימה - אין צורך בבקשת סידור נוספת)
      // העדכון נבנה מהמצב העדכני (prev) ולא מעותק ישן - כדי שפעולות מהירות לא ידרסו זו את זו
      setItems(prev => [
        newItem,
        ...prev.filter(item => !item.purchased),
        ...prev.filter(item => item.purchased),
      ]);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף את המוצר');
    } finally {
      endMutation();
    }
  };

  const handleTogglePurchased = async item => {
    startMutation();
    try {
      const updated = await updateItem(item.id, { purchased: !item.purchased });
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את המוצר');
    } finally {
      endMutation();
    }
  };

  const handleUpdateAmount = async (item, newAmount) => {
    startMutation();
    try {
      const updated = await updateItem(item.id, { amount: newAmount });
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הכמות');
    } finally {
      endMutation();
    }
  };

  const handleEditItem = async newName => {
    if (!editingItem || !newName?.trim()) return;
    startMutation();
    try {
      const updated = await updateItem(editingItem.id, { name: newName });
      setItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)));
      setEditingItem(null);
      setModalVisible(false);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לערוך את המוצר');
    } finally {
      endMutation();
    }
  };

  const handleDeleteItem = async itemId => {
    Alert.alert('מחיקת מוצר', 'האם אתה בטוח שברצונך למחוק מוצר זה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          startMutation();
          try {
            await deleteItem(itemId);
            setItems(prev => prev.filter(i => i.id !== itemId));
          } catch (error) {
            if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את המוצר');
          } finally {
            endMutation();
          }
        },
      },
    ]);
  };

  const handleDragBegin = () => {
    startMutation(); // גרירה נחשבת תחילת שינוי - רענון שבדרך נזרק
    setIsDragging(true);
  };

  const handleDragEnd = async ({ data }) => {
    setIsDragging(false);
    setItems(prev => [...data, ...prev.filter(item => item.purchased)]);
    const reorderedData = data.map((item, index) => ({
      id: item.id,
      position: index,
    }));
    try {
      await reorderItems(reorderedData);
    } catch (error) {
      console.log('Failed to save order to server');
    } finally {
      endMutation();
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
        onDragBegin={handleDragBegin}
        onDragEnd={handleDragEnd}
        refreshing={refreshing}
        onRefresh={handleRefresh}
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
