import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getShoppingLists,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  duplicateList,
  getShoppingList,
} from '../../services/api';
import ListActionsMenu from '../../components/ListActionsMenu/ListActionsMenu';
import { buildListShareText } from '../../services/shareText';
import JoinListModal from '../../components/JoinListModal/JoinListModal';
import useLiveRefresh from '../../hooks/useLiveRefresh';
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

  // הרשימה שתפריט הפעולות (⋮) פתוח עבורה
  const [menuList, setMenuList] = useState(null);

  // מצבים לניהול חלון ההצטרפות עם קוד הזמנה
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // עולה בתחילת כל פעולה שלי ובסופה - רענון שהתחיל לפני שינוי שלי נזרק
  const mutationVersion = useRef(0);
  // מספר פעולות שלי שעדיין בדרך - רענון שחוזר בזמן הזה נזרק
  const pendingMutations = useRef(0);
  const startMutation = () => {
    mutationVersion.current++;
    pendingMutations.current++;
  };
  const endMutation = () => {
    mutationVersion.current++;
    pendingMutations.current--;
  };

  useEffect(() => {
    loadLists();
  }, []);

  // רענון שקט: מחליף את הרשימות בלי מסך טעינה. שגיאות מושתקות - ננסה שוב בפעם הבאה
  const refreshLists = useCallback(async () => {
    const version = mutationVersion.current;
    const data = await getShoppingLists();
    // פעולה שלי בדרך, או שבוצע שינוי שלי בינתיים - התשובה ישנה
    if (pendingMutations.current > 0 || version !== mutationVersion.current) {
      return;
    }
    setLists(data || []);
  }, []);

  useLiveRefresh(refreshLists, 15000);

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLists();
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את הרשימות שלך.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoined = list => {
    setJoinModalVisible(false);
    setLists(prev => (prev.some(l => l.id === list.id) ? prev : [...prev, list]));
    navigation.navigate('ShoppingListItems', {
      listId: list.id,
      listName: list.name,
      isOwner: false,
    });
  };

  const loadLists = async () => {
    try {
      setLoading(true);
      const data = await getShoppingLists();
      setLists(data || []);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
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

    startMutation();
    try {
      const newList = await createShoppingList(newListName.trim());
      setLists(prev => [...prev, newList]);
      setNewListName(''); // מנקה את האינבוקס אחרי ההוספה
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו ליצור רשימה חדשה');
    } finally {
      endMutation();
    }
  };

  const handleDeleteList = listId => {
    Alert.alert('מחיקת רשימה', 'האם אתה בטוח שברצונך למחוק רשימה זו?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          startMutation();
          try {
            await deleteShoppingList(listId);
            // עדכון לפי המצב העדכני (ולא עותק ישן) - כדי שכמה פעולות מהירות לא ידרסו זו את זו
            setLists(prev => prev.filter(l => l.id !== listId));
          } catch (error) {
            if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את הרשימה');
          } finally {
            endMutation();
          }
        },
      },
    ]);
  };

  const handleDuplicateList = async list => {
    setMenuList(null);
    startMutation();
    try {
      const copy = await duplicateList(list.id);
      setLists(prev => (prev.some(l => l.id === copy.id) ? prev : [...prev, copy]));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', error.message || 'לא הצלחנו לשכפל את הרשימה');
    } finally {
      endMutation();
    }
  };

  const handleShareText = async list => {
    setMenuList(null);
    try {
      const items = await getShoppingList(list.id);
      const message = buildListShareText(list.name, items);
      if (!message) {
        Alert.alert('', 'אין מוצרים לשליחה');
        return;
      }
      await Share.share({ message });
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', error.message || 'לא הצלחנו לשלוח את הרשימה');
    }
  };

  const openRenameModal = list => {
    setEditingList(list);
    setNewNameValue(list.name);
    setRenameModalVisible(true);
  };

  const handleRenameList = async () => {
    if (!editingList || !newNameValue.trim()) return;

    startMutation();
    try {
      const updated = await updateShoppingList(editingList.id, {
        name: newNameValue.trim(),
      });
      setLists(prev =>
        prev.map(l =>
          l.id === editingList.id
            ? updated || { ...l, name: newNameValue.trim() }
            : l,
        ),
      );
      setRenameModalVisible(false);
      setEditingList(null);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את שם הרשימה');
    } finally {
      endMutation();
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
          testID="new_list_input" // <-- מזהה לשדה יצירת רשימה
          accessibilityLabel="new_list_input"
        />
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateList}
          activeOpacity={0.85}
          testID="create_list_button" // <-- מזהה לכפתור יצירת רשימה
          accessibilityLabel="create_list_button"
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.joinLink}
        onPress={() => setJoinModalVisible(true)}
        testID="join_list_link"
        accessibilityLabel="join_list_link"
      >
        <Text style={styles.joinLinkText}>יש לך קוד הזמנה? הצטרפות לרשימה</Text>
      </TouchableOpacity>

      <FlatList
        data={lists}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            colors={[colors.primary]}
          />
        }
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
                  isOwner: item.is_owner !== false,
                })
              }
              testID="list_card" // <-- מזהה לכרטיס רשימה כדי ללחוץ עליה
              accessibilityLabel="list_card"
            >
              <Text style={styles.listNameText}>{item.name}</Text>
            </TouchableOpacity>

            {/* ברשימה ששותפה איתך מוצג תג, ולכל רשימה יש תפריט פעולות */}
            {item.is_owner === false && (
              <View style={styles.sharedBadge} testID={`shared_badge_${item.id}`}>
                <Text style={styles.sharedBadgeText}>משותפת</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setMenuList(item)}
              style={styles.actionIconBtn}
              testID={`list_menu_${item.id}`}
              accessibilityLabel="list_menu_button"
            >
              <Text style={styles.menuIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            אין עדיין רשימות. צור רשימה חדשה למעלה!
          </Text>
        }
      />

      <ListActionsMenu
        visible={!!menuList}
        list={menuList}
        onClose={() => setMenuList(null)}
        onRename={list => {
          setMenuList(null);
          openRenameModal(list);
        }}
        onDuplicate={handleDuplicateList}
        onShareText={handleShareText}
        onDelete={list => {
          setMenuList(null);
          handleDeleteList(list.id);
        }}
      />

      <JoinListModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoined={handleJoined}
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
                testID="rename_save_button"
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
