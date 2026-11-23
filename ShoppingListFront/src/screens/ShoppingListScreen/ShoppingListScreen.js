import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  AppState,
  RefreshControl,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// קומפוננטות מופרדות
import ShoppingListItem from '../../components/ShoppingListItem/ShoppingListItem';
import PurchasedItemsSection from '../../components/PurchasedItemsSection/PurchasedItemsSection';
import AddItemInput from '../../components/AddItemInput/AddItemInput';
import EditItemModal from '../../components/EditItemModal/EditItemModal';
import MembersModal from '../../components/MembersModal/MembersModal';
import UndoBar from '../../components/UndoBar/UndoBar';

// שירותים ועיצובים
import {
  getShoppingList,
  addItem,
  updateItem,
  deleteItem,
  reorderItems,
  getListMembers,
  restorePurchased,
  clearPurchased,
  getListCategories,
  createListCategory,
  deleteListCategory,
} from '../../services/api';
import { resolveCategory, customKey } from '../../services/categories';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { styles } from './ShoppingListScreen.styles';
import { colors } from '../../theme/colors';

const LIVE_REFRESH_MS = 3000;
// כמה זמן אפשר לבטל פעולה (מחיקה נשלחת לשרת רק אחרי זמן זה)
export const UNDO_MS = 5000;

export const sortModeKey = listId => `@sort_mode_${listId}`;

// מיון המוצרים לפי שדה ה-position כדי לשמור על הסדר הנכון מהשרת
const sortByPosition = data =>
  (data || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const ShoppingListScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { listId, listName, isOwner = true } = route.params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [memberCount, setMemberCount] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  // 'manual' (גרירה) או 'category' (מקובץ לפי מחלקות)
  const [sortMode, setSortMode] = useState('manual');
  const currentListId = listId;
  // עולה בתחילת כל פעולה שלי ובסופה - רענון שהתחיל לפני שינוי שלי נזרק
  const mutationVersion = useRef(0);
  // מספר פעולות שלי שעדיין בדרך - רענון שחוזר בזמן הזה נזרק
  const pendingMutations = useRef(0);
  const lostAccessHandled = useRef(false);
  // מחיקה ממתינה: { item, timer }. המוצר מוסתר מהתצוגה ומתשובות הרענון עד שהמחיקה נשלחת
  const pendingDelete = useRef(null);
  const hiddenIds = useRef(new Set());
  const barTimer = useRef(null);
  // עולה בתחילת כל פעולה של המשתמש - תשובה מאוחרת לא דורסת פס ביטול של פעולה חדשה יותר
  const actionSeq = useRef(0);
  const [undoState, setUndoState] = useState(null);
  const startMutation = () => {
    mutationVersion.current++;
    pendingMutations.current++;
  };
  const endMutation = () => {
    mutationVersion.current++;
    pendingMutations.current--;
  };

  const hideBar = () => {
    clearTimeout(barTimer.current);
    barTimer.current = null;
    setUndoState(null);
  };

  const showBar = (message, onUndo) => {
    clearTimeout(barTimer.current);
    setUndoState({ message, onUndo });
    barTimer.current = setTimeout(() => setUndoState(null), UNDO_MS);
  };

  // שולח את המחיקה הממתינה לשרת עכשיו (טיימר, יציאה מהמסך, רקע או פעולה חדשה)
  const commitPendingDelete = async () => {
    const pending = pendingDelete.current;
    if (!pending) return;
    pendingDelete.current = null;
    clearTimeout(pending.timer);
    hideBar();
    try {
      await deleteItem(pending.item.id);
      setItems(prev => prev.filter(i => i.id !== pending.item.id));
    } catch (error) {
      if (error.status === 404) {
        // המוצר כבר נמחק (למשל על ידי בן משפחה) - נחשב הצלחה
        setItems(prev => prev.filter(i => i.id !== pending.item.id));
      } else if (error.status === 403) {
        // אבדה הגישה לרשימה - הודעה אחת וחזרה (מוגן מפני כפילות)
        handleLostAccess();
      } else if (!error.sessionExpired) {
        Alert.alert('שגיאה', 'לא הצלחנו למחוק את המוצר');
      }
    } finally {
      // בכישלון המוצר מופיע שוב, כי הוא עדיין ברשימת המוצרים
      hiddenIds.current.delete(pending.item.id);
      // שינוי מצב אמיתי כדי שהמסך יצויר מחדש והמוצר יופיע שוב אחרי כישלון
      setItems(prev => [...prev]);
      endMutation();
    }
  };

  const commitPendingDeleteRef = useRef(commitPendingDelete);
  commitPendingDeleteRef.current = commitPendingDelete;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        commitPendingDeleteRef.current();
      }
    });
    return () => {
      subscription?.remove?.();
      clearTimeout(barTimer.current);
      commitPendingDeleteRef.current();
    };
  }, []);

  useEffect(() => {
    if (listId) {
      loadListItems(listId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  // מצב המיון נשמר לכל רשימה
  useEffect(() => {
    if (!listId) return undefined;
    let cancelled = false;
    Promise.resolve(AsyncStorage.getItem(sortModeKey(listId)))
      .then(value => {
        if (!cancelled)
          setSortMode(value === 'category' ? 'category' : 'manual');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const loadCategories = async () => {
    try {
      const data = await getListCategories(listId);
      if (Array.isArray(data)) setCustomCategories(data);
    } catch (error) {
      // שקט - נשארות המחלקות המובנות
    }
  };

  useEffect(() => {
    if (listId) loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const toggleSortMode = () => {
    const next = sortMode === 'category' ? 'manual' : 'category';
    setSortMode(next);
    Promise.resolve(AsyncStorage.setItem(sortModeKey(listId), next)).catch(
      () => {},
    );
  };

  // מספר המשתתפים מוצג על כפתור הכותרת
  const loadMemberCount = async () => {
    if (!listId) return;
    try {
      const members = await getListMembers(listId);
      if (Array.isArray(members)) setMemberCount(members.length);
    } catch (error) {
      // שקט - הכפתור פשוט לא יציג מספר
    }
  };

  useEffect(() => {
    loadMemberCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const closeMembers = () => {
    setMembersVisible(false);
    loadMemberCount();
  };

  const handleLeft = () => {
    // יצאתי מרצון - רענון שיחזיר 403 מעכשיו לא יציג התראה ולא יחזיר שוב
    lostAccessHandled.current = true;
    setMembersVisible(false);
    navigation.goBack();
  };

  // אין יותר גישה לרשימה (403/404): התראה אחת וחזרה אחת, גם אם כמה בקשות נכשלו
  const handleLostAccess = () => {
    if (lostAccessHandled.current) return;
    lostAccessHandled.current = true;
    Alert.alert('שים לב', 'אין לך יותר גישה לרשימה הזו');
    navigation.goBack();
  };

  const loadListItems = async id => {
    try {
      setLoading(true);
      const data = await getShoppingList(id);
      setItems(sortByPosition(data));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      if (error.status === 403 || error.status === 404) {
        handleLostAccess();
        return;
      }
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
      const [data, cats] = await Promise.all([
        getShoppingList(listId),
        Promise.resolve(getListCategories(listId)).catch(() => null),
      ]);
      // פעולה שלי בדרך, או שבוצע שינוי שלי בינתיים - התשובה ישנה
      if (pendingMutations.current > 0 || version !== mutationVersion.current) {
        return;
      }
      setItems(sortByPosition(data));
      if (Array.isArray(cats)) setCustomCategories(cats);
    } catch (error) {
      if (error.sessionExpired) return; // האפליקציה כבר מטפלת בזה
      if (error.status === 403 || error.status === 404) {
        handleLostAccess();
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

    // מוצר שמחיקתו ממתינה מוסתר, ולכן אפשר להוסיף שוב את אותו שם.
    // ההתאמה נבדקת לפני שהמחיקה נשלחת (אחריה המוצר כבר לא מוסתר אבל גם לא נמחק מהעותק הזה)
    const wanted = name.trim().toLowerCase();
    const matches = items
      .filter(item => !hiddenIds.current.has(item.id))
      .filter(item => item.name.trim().toLowerCase() === wanted);

    // פעולה חדשה מאשרת מחיקה ממתינה ומסתירה פס ביטול קודם.
    // ממתינים לסיום המחיקה: אחרת השרת עלול להחיות בדיוק את המוצר שנמחק עכשיו
    await commitPendingDelete();
    hideBar();
    actionSeq.current++;

    // מוצר פתוח באותו שם - כפילות. מוצר שנקנה אינו חוסם: השרת מחזיר אותו לרשימה (קנייה חוזרת)
    if (matches.some(item => !item.purchased)) {
      Alert.alert('שים לב', 'המוצר כבר קיים ברשימה');
      return;
    }

    startMutation();
    try {
      const newItem = await addItem(name, currentListId, 1);

      // הכנסת המוצר החדש לראש רשימת הלא-נקונים.
      // (השרת עצמו שומר מוצר חדש בראש הרשימה - אין צורך בבקשת סידור נוספת)
      // העדכון נבנה מהמצב העדכני (prev) ולא מעותק ישן - כדי שפעולות מהירות לא ידרסו זו את זו
      // קנייה חוזרת: השרת החזיר מוצר קיים - מחליפים אותו במקום ומעבירים לראש, בלי כפילות
      setItems(prev => {
        const rest = prev.filter(item => item.id !== newItem.id);
        return [
          newItem,
          ...rest.filter(item => !item.purchased),
          ...rest.filter(item => item.purchased),
        ];
      });
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף את המוצר');
    } finally {
      endMutation();
    }
  };

  // ביטול סימון: שולח את הערך ההפוך, בתוך משמר השינויים
  const undoToggle = async (itemId, previousPurchased) => {
    actionSeq.current++;
    hideBar();
    startMutation();
    try {
      const updated = await updateItem(itemId, { purchased: previousPurchased });
      setItems(prev => prev.map(i => (i.id === itemId ? updated : i)));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לבטל את הפעולה');
    } finally {
      endMutation();
    }
  };

  const handleTogglePurchased = async item => {
    commitPendingDelete();
    hideBar();
    const seq = ++actionSeq.current;
    startMutation();
    try {
      const updated = await updateItem(item.id, { purchased: !item.purchased });
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
      // פעולה חדשה יותר כבר התחילה - לא דורסים את הפס שלה
      if (seq === actionSeq.current) {
        showBar(updated.purchased ? 'סומן כנקנה' : 'הוחזר לרשימה', () =>
          undoToggle(item.id, item.purchased),
        );
      }
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את המוצר');
    } finally {
      endMutation();
    }
  };

  const handleUpdateAmount = async (item, newAmount) => {
    commitPendingDelete();
    actionSeq.current++;
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

  const handleEditItem = async ({ name: newName, category }) => {
    if (!editingItem || !newName?.trim()) return;
    commitPendingDelete();
    actionSeq.current++;
    startMutation();
    try {
      const updates = { name: newName };
      // מחלקה נשלחת רק כשהשתנתה, כדי לא לדרוס בחירה של בן משפחה
      // undefined = המשתמש לא נגע במחלקה
      if (
        category !== undefined &&
        category !== (editingItem.category ?? null)
      ) {
        updates.category = category ?? null;
      }
      const updated = await updateItem(editingItem.id, updates);
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

  // יצירת מחלקה מותאמת. מחזיר את המחלקה שנוצרה (או undefined בכישלון)
  const handleCreateCategory = async name => {
    commitPendingDelete();
    actionSeq.current++;
    startMutation();
    try {
      const created = await createListCategory(currentListId, name);
      setCustomCategories(prev => [...prev, created]);
      return created;
    } catch (error) {
      if (error.sessionExpired) return undefined;
      if (error.status === 403 || error.status === 404) {
        handleLostAccess();
        return undefined;
      }
      Alert.alert('שגיאה', error.message || 'לא הצלחנו ליצור את המחלקה');
      return undefined;
    } finally {
      endMutation();
    }
  };

  // מחזיר true רק כשהמחלקה נמחקה
  const handleDeleteCategory = async category => {
    commitPendingDelete();
    actionSeq.current++;
    startMutation();
    try {
      await deleteListCategory(currentListId, category.id);
    } catch (error) {
      // 404 - כבר נמחקה (למשל על ידי בן משפחה): נחשב הצלחה
      if (error.status !== 404) {
        if (error.sessionExpired) return false;
        if (error.status === 403) {
          handleLostAccess();
          return false;
        }
        Alert.alert('שגיאה', 'לא הצלחנו למחוק את המחלקה');
        return false;
      }
    } finally {
      endMutation();
    }
    const key = customKey(category.id);
    setCustomCategories(prev => prev.filter(c => c.id !== category.id));
    // המוצרים שבמחלקה חוזרים לסיווג אוטומטי (כמו בשרת)
    setItems(prev =>
      prev.map(i => (i.category === key ? { ...i, category: null } : i)),
    );
    return true;
  };

  // פעולה על כל המוצרים שנקנו: מאשרת מחיקה ממתינה, ועוברת במשמר השינויים
  const runPurchasedBulk = async (request, applyLocally) => {
    // המחיקה הממתינה מסתיימת לפני הבקשה הקבוצתית, כדי שלא יהיה מרוץ ביניהן
    await commitPendingDelete();
    actionSeq.current++;
    hideBar();
    startMutation();
    try {
      await request(currentListId);
      setItems(applyLocally);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', error.message || 'לא הצלחנו לעדכן את הרשימה');
    } finally {
      endMutation();
    }
  };

  const handleRestoreAll = () =>
    runPurchasedBulk(restorePurchased, prev =>
      prev.map(i => (i.purchased ? { ...i, purchased: false } : i)),
    );

  const handleClearAll = () =>
    runPurchasedBulk(clearPurchased, prev => prev.filter(i => !i.purchased));

  const handleDeleteItem = itemId => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    // כבר ממתין למחיקה (למשל החלקה וגם כפתור) - לא רושמים שוב
    if (hiddenIds.current.has(itemId)) return;
    actionSeq.current++;
    // פעולה אחת בכל רגע: מחיקה קודמת נשלחת עכשיו
    commitPendingDelete();
    hideBar();
    startMutation(); // המחיקה הממתינה נספרת כפעולה שלי - רענון שבדרך נזרק
    hiddenIds.current.add(itemId);
    const timer = setTimeout(() => commitPendingDelete(), UNDO_MS);
    pendingDelete.current = { item, timer };
    showBar('המוצר נמחק', undoDelete);
  };

  const undoDelete = () => {
    const pending = pendingDelete.current;
    if (!pending) return;
    pendingDelete.current = null;
    clearTimeout(pending.timer);
    hiddenIds.current.delete(pending.item.id);
    hideBar();
    endMutation();
  };

  const handleDragBegin = () => {
    commitPendingDelete();
    actionSeq.current++;
    startMutation(); // גרירה נחשבת תחילת שינוי - רענון שבדרך נזרק
    setIsDragging(true);
  };

  const handleDragEnd = async ({ data }) => {
    setIsDragging(false);
    // מוצר מוסתר (מחיקה בדרך) נשאר במצב, כדי שיוצג שוב אם המחיקה תיכשל
    setItems(prev => [
      ...data,
      ...prev.filter(
        item => item.purchased || hiddenIds.current.has(item.id),
      ),
    ]);
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
    commitPendingDelete();
    setEditingItem(item);
    setModalVisible(true);
  };

  // המחלקה והצבע של כל מוצר מחושבים רק כשהמוצרים או המחלקות משתנים (לא בכל ציור מחדש).
  // הנקודה הצבעונית מוזנת לשורת המוצר דרך categoryColor
  const resolvedItems = useMemo(
    () =>
      items.map(item => {
        const cat = resolveCategory(item, customCategories);
        return { item: { ...item, categoryColor: cat.color }, cat };
      }),
    [items, customCategories],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // מוצר שמחיקתו ממתינה מוסתר גם אם רענון חי החזיר אותו
  const visibleResolved = resolvedItems.filter(
    r => !hiddenIds.current.has(r.item.id),
  );
  const visibleItems = visibleResolved.map(r => r.item);
  const unpurchasedItems = visibleItems.filter(item => !item.purchased);
  const purchasedItems = visibleItems.filter(item => item.purchased);
  const categoryMode = sortMode === 'category';

  // קבוצות לפי מחלקה, בסדר המעברים (מובנות, מותאמות, אחר)
  const groups = [];
  if (categoryMode) {
    const byKey = new Map();
    visibleResolved
      .filter(r => !r.item.purchased)
      .forEach(({ item, cat }) => {
        if (!byKey.has(cat.key)) {
          const group = { ...cat, items: [] };
          byKey.set(cat.key, group);
          groups.push(group);
        }
        byKey.get(cat.key).items.push(item);
      });
    groups.sort((x, y) => x.order - y.order);
  }

  const listHeader = (
    <View>
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 טיפ שימושי:</Text>
        <Text style={styles.tipText}>
          • <Text style={styles.boldText}>סימון כנקנה:</Text> החלק שמאלה.
          {'\n'}• <Text style={styles.boldText}>מחיקת מוצר:</Text> החלק ימינה.
        </Text>
      </View>

      {/* הכותרת המקורית של "מוצרים לקנייה" מופיעה מתחת לטיפ במידה ויש מוצרים */}
      {unpurchasedItems.length > 0 && !categoryMode && (
        <Text style={styles.sectionLabel}>מוצרים לקנייה</Text>
      )}
    </View>
  );

  const purchasedFooter = (
    <PurchasedItemsSection
      items={purchasedItems}
      onTogglePurchased={handleTogglePurchased}
      onEdit={openEditModal}
      onDelete={handleDeleteItem}
      onUpdateAmount={handleUpdateAmount}
      onRestoreAll={handleRestoreAll}
      onClearAll={handleClearAll}
    />
  );

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
          <TouchableOpacity
            onPress={() => setMembersVisible(true)}
            style={styles.membersButton}
            activeOpacity={0.8}
            testID="members_button"
            accessibilityLabel="members_button"
          >
            <Text style={styles.membersButtonText}>👥</Text>
            {memberCount !== null && (
              <Text style={styles.membersButtonText}>{memberCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.mainTitle} numberOfLines={1}>
          {listName || 'רשימת קניות'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {unpurchasedItems.length > 0
            ? `${unpurchasedItems.length} מוצרים לקנייה`
            : visibleItems.length > 0
            ? 'כל המוצרים נקנו 🎉'
            : 'הרשימה עדיין ריקה'}
        </Text>
      </View>

      {/* תיבת ההוספה נשארת קבועה כדי שתמיד יהיה אפשר להוסיף מוצרים */}
      <View style={styles.addCard}>
        <AddItemInput onAdd={handleAddItem} listId={currentListId} />
      </View>

      <TouchableOpacity
        testID="sort_mode_toggle"
        accessibilityLabel="מיון: ידני או לפי מחלקות"
        style={styles.sortToggle}
        onPress={toggleSortMode}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.sortToggleText,
            !categoryMode && styles.sortToggleActive,
          ]}
        >
          סדר ידני
        </Text>
        <Text style={styles.sortToggleText}> / </Text>
        <Text
          style={[
            styles.sortToggleText,
            categoryMode && styles.sortToggleActive,
          ]}
        >
          לפי מחלקות
        </Text>
      </TouchableOpacity>

      {categoryMode ? (
        // במצב מחלקות אין גרירה: רשימה רגילה עם כותרת לכל מחלקה
        <ScrollView
          testID="category_list"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {listHeader}
          {groups.map(group => (
            <View key={group.key}>
              <View
                style={styles.categoryHeader}
                testID={`category_header_${group.key}`}
              >
                <View
                  style={[
                    styles.categoryHeaderDot,
                    { backgroundColor: group.color },
                  ]}
                />
                <Text style={styles.categoryHeaderText}>
                  {group.name} ({group.items.length})
                </Text>
              </View>
              {group.items.map(item => (
                <ShoppingListItem
                  key={item.id}
                  item={item}
                  onTogglePurchased={() => handleTogglePurchased(item)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onUpdateAmount={newAmount =>
                    handleUpdateAmount(item, newAmount)
                  }
                  isActive={false}
                />
              ))}
            </View>
          ))}
          {purchasedFooter}
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={unpurchasedItems}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onDragBegin={handleDragBegin}
          onDragEnd={handleDragEnd}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={listHeader}
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
          ListFooterComponent={purchasedFooter}
        />
      )}

      <UndoBar
        visible={!!undoState}
        message={undoState?.message}
        onUndo={undoState?.onUndo}
      />

      <EditItemModal
        visible={modalVisible}
        item={editingItem}
        onSave={handleEditItem}
        categories={customCategories}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
        onClose={() => setModalVisible(false)}
      />

      <MembersModal
        visible={membersVisible}
        listId={listId}
        listName={listName}
        isOwner={isOwner}
        onClose={closeMembers}
        onLeft={handleLeft}
      />
    </View>
  );
};

export default ShoppingListScreen;
