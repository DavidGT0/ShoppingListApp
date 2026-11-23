import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  AppState,
  I18nManager,
} from 'react-native';
import { ScrollView, RefreshControl } from 'react-native-gesture-handler';
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
import ProgressRing from '../../components/ProgressRing/ProgressRing';
import DepartmentRoute from '../../components/DepartmentRoute/DepartmentRoute';
import { buildRoute } from '../../components/DepartmentRoute/buildRoute';
import OfflineBanner, {
  showOfflineBlockedAlert,
} from '../../components/OfflineBanner/OfflineBanner';

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
import {
  resolveCategory,
  customKey,
  normalizeCategories,
} from '../../services/categories';
import {
  loadWithCache,
  cacheKeys,
  INITIAL_LOAD_GRACE_MS,
} from '../../services/offlineCache';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { makeStyles } from './ShoppingListScreen.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LIVE_REFRESH_MS = 3000;
// מחוות הגרירה של הרשימה תופסת כל תנועה אנכית ובולעת את המשיכה לריענון.
// מגבילים את תחילת המחווה לרצועה של ידית הגרירה, שבקצה השמאלי של השורה:
// ריווח הרשימה 20 + ריווח השורה 12 = הידית ב-32-60dp, ועם hitSlop ב-22-70dp.
// הרצועה (72dp) מכסה רק אותה, כך שמשיכה מכל מקום אחר (גם מהפח) מגיעה לרכיב הריענון
const DRAG_HIT_SLOP = { [I18nManager.isRTL ? 'right' : 'left']: 0, width: 72 };
// כמה זמן אפשר לבטל פעולה (מחיקה נשלחת לשרת רק אחרי זמן זה)
export const UNDO_MS = 5000;

export const sortModeKey = listId => `@sort_mode_${listId}`;

// מיון המוצרים לפי שדה ה-position כדי לשמור על הסדר הנכון מהשרת
const sortByPosition = data =>
  (data || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const ShoppingListScreen = ({ route, navigation }) => {
  const styles = useStyles(makeStyles);
  const { colors, isDark, setMode } = useTheme();
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
  const [currentUsername, setCurrentUsername] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  // שמות, סמלים וסדר המחלקות של הרשימה (נשמר בשרת, מתעדכן ברענון החי)
  const [layout, setLayout] = useState([]);
  // 'manual' (גרירה) או 'category' (מקובץ לפי מחלקות)
  const [sortMode, setSortMode] = useState('manual');
  // מצב לא מקוון: מוצגת הגרסה השמורה ואי אפשר לערוך. ה-ref משקף את הערך לפונקציות שנתפסו קודם
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false);
  const setOffline = value => {
    isOfflineRef.current = value;
    setIsOffline(value);
  };
  // true אם במצב לא מקוון (ואז מציג את ההודעה). חייב לרוץ לפני כל בקשת שינוי
  const blockIfOffline = () => {
    if (!isOfflineRef.current) return false;
    showOfflineBlockedAlert();
    return true;
  };
  // שגיאת רשת בבקשת שינוי: עוברים למצב לא מקוון ומציגים את ההודעה במקום שגיאה כללית
  // ההודעה מוצגת רק במעבר למצב לא מקוון, כדי שכמה בקשות שנכשלו יחד לא יערמו הודעות
  const failedOffline = error => {
    if (!error?.network) return false;
    const wasOffline = isOfflineRef.current;
    setOffline(true);
    if (!wasOffline) showOfflineBlockedAlert();
    return true;
  };
  // גרירה שהתחילה במצב לא מקוון נחסמה - בסיומה אין מה לשמור
  const dragBlocked = useRef(false);
  // יש כבר מוצרים/מחלקות על המסך - מטמון לא דורס אותם, הוא רק מעביר למצב לא מקוון
  const hasItems = useRef(false);
  const hasCategories = useRef(false);
  // רענון חי כבר הביא נתוני שרת - תשובה מאוחרת של הטעינה הראשונה כבר ישנה
  const liveApplied = useRef(false);
  // מבטל את טיימר ההמתנה של הטעינה הראשונה ביציאה מהמסך
  const loadAbort = useRef(new AbortController());
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
      if (isOfflineRef.current) {
        // הרשת נפלה בזמן ההמתנה - לא שולחים, והמוצר חוזר
        const offlineError = new Error('offline');
        offlineError.network = true;
        throw offlineError;
      }
      await deleteItem(pending.item.id);
      setItems(prev => prev.filter(i => i.id !== pending.item.id));
    } catch (error) {
      if (error.status === 404) {
        // המוצר כבר נמחק (למשל על ידי בן משפחה) - נחשב הצלחה
        setItems(prev => prev.filter(i => i.id !== pending.item.id));
      } else if (error.status === 403) {
        // אבדה הגישה לרשימה - הודעה אחת וחזרה (מוגן מפני כפילות)
        handleLostAccess();
      } else if (failedOffline(error)) {
        // המוצר חוזר (ב-finally) והמסך עובר למצב צפייה
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
    const controller = loadAbort.current;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        commitPendingDeleteRef.current();
      }
    });
    return () => {
      subscription?.remove?.();
      controller.abort();
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

  // המטמון עלול להחזיק את הצורה הישנה (מערך): normalizeCategories מטפל בשתיהן
  const applyCategories = value => {
    const { custom, layout: nextLayout } = normalizeCategories(value);
    setCustomCategories(custom);
    setLayout(nextLayout);
  };

  const loadCategories = async () => {
    try {
      const { data, fromCache, alreadyShown } = await loadWithCache(
        () => getListCategories(listId),
        cacheKeys.categories(listId),
        {
          graceMs: INITIAL_LOAD_GRACE_MS,
          signal: loadAbort.current.signal,
          onEarlyCache: cached => {
            if (cached && !hasCategories.current) {
              applyCategories(cached);
              hasCategories.current = true;
            }
          },
        },
      );
      if (alreadyShown) return;
      if (data && !(fromCache && hasCategories.current)) {
        applyCategories(data);
        hasCategories.current = true;
      }
      if (fromCache) setOffline(true);
    } catch (error) {
      // שקט - נשארות המחלקות המובנות
    }
  };

  useEffect(() => {
    if (listId) loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const selectSortMode = next => {
    if (next === sortMode) return;
    setSortMode(next);
    Promise.resolve(AsyncStorage.setItem(sortModeKey(listId), next)).catch(
      () => {},
    );
  };

  // שם המשתמש הנוכחי (נשמר בכניסה) - לצורך "נוסף ע״י".
  // נקרא שוב בכל חזרה למסך, כי אפשר לשנות אותו בהגדרות
  useEffect(() => {
    let cancelled = false;
    const loadUsername = () =>
      Promise.resolve(AsyncStorage.getItem('username'))
        .then(value => {
          if (!cancelled) setCurrentUsername(value || null);
        })
        .catch(() => {});
    loadUsername();
    const unsubscribe = navigation?.addListener?.('focus', loadUsername);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const version = mutationVersion.current;
      let shownEarly = false;
      const { data, fromCache, alreadyShown } = await loadWithCache(
        () => getShoppingList(id),
        cacheKeys.items(id),
        {
          graceMs: INITIAL_LOAD_GRACE_MS,
          signal: loadAbort.current.signal,
          // הבקשה איטית: מציגים את הגרסה השמורה והבקשה ממשיכה ברקע
          onEarlyCache: cached => {
            shownEarly = true;
            setLoading(false);
            // כבר יש נתוני שרת על המסך - לא מחליפים ולא עוברים למצב לא מקוון
            if (hasItems.current) return;
            setItems(sortByPosition(cached));
            hasItems.current = true;
            setOffline(true);
          },
        },
      );
      // המטמון כבר מוצג והבקשה נכשלה ברשת - נשארים כמו שזה
      if (alreadyShown) return;
      // המטמון הוצג מוקדם ובינתיים הגיעו נתונים חדשים יותר (רענון או שינוי שלי) - התשובה ישנה
      if (
        shownEarly &&
        (liveApplied.current ||
          pendingMutations.current > 0 ||
          version !== mutationVersion.current)
      ) {
        return;
      }
      setItems(sortByPosition(data));
      hasItems.current = true;
      setOffline(fromCache);
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
      const [itemsResult, catsResult] = await Promise.all([
        loadWithCache(() => getShoppingList(listId), cacheKeys.items(listId)),
        loadWithCache(
          () => getListCategories(listId),
          cacheKeys.categories(listId),
        ).catch(() => null),
      ]);
      // פעולה שלי בדרך, או שבוצע שינוי שלי בינתיים - התשובה ישנה
      if (pendingMutations.current > 0 || version !== mutationVersion.current) {
        return;
      }
      // נפלה הרשת ויש כבר נתונים על המסך: לא מחליפים אותם בעותק שמור ישן יותר
      if (itemsResult.fromCache && hasItems.current) {
        setOffline(true);
        return;
      }
      setItems(sortByPosition(itemsResult.data));
      hasItems.current = true;
      if (!itemsResult.fromCache) liveApplied.current = true;
      if (catsResult?.data && !(catsResult.fromCache && hasCategories.current)) {
        applyCategories(catsResult.data);
        hasCategories.current = true;
      }
      // חוזרים למצב מקוון רק כשהמוצרים הגיעו מהשרת
      setOffline(itemsResult.fromCache || !!catsResult?.fromCache);
    } catch (error) {
      if (error.sessionExpired || error.staleToken) return; // האפליקציה כבר מטפלת בזה / טוקן שהוחלף
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
    if (blockIfOffline()) return;
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
    // המחיקה הממתינה נכשלה ברשת: כבר הוצגה הודעה ואין שולחים כלום
    if (isOfflineRef.current) return;
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
      if (failedOffline(error)) return;
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף את המוצר');
    } finally {
      endMutation();
    }
  };

  // ביטול סימון: שולח את הערך ההפוך, בתוך משמר השינויים
  const undoToggle = async (itemId, previousPurchased) => {
    if (blockIfOffline()) return;
    actionSeq.current++;
    hideBar();
    startMutation();
    try {
      const updated = await updateItem(itemId, {
        purchased: previousPurchased,
      });
      setItems(prev => prev.map(i => (i.id === itemId ? updated : i)));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      if (failedOffline(error)) return;
      Alert.alert('שגיאה', 'לא הצלחנו לבטל את הפעולה');
    } finally {
      endMutation();
    }
  };

  const handleTogglePurchased = async item => {
    if (blockIfOffline()) return;
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
      if (failedOffline(error)) return;
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את המוצר');
    } finally {
      endMutation();
    }
  };

  const handleUpdateAmount = async (item, newAmount) => {
    if (blockIfOffline()) return;
    commitPendingDelete();
    actionSeq.current++;
    startMutation();
    try {
      const updated = await updateItem(item.id, { amount: newAmount });
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      if (failedOffline(error)) return;
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הכמות');
    } finally {
      endMutation();
    }
  };

  const handleEditItem = async ({ name: newName, category, unit, note }) => {
    if (!editingItem || !newName?.trim()) return;
    if (blockIfOffline()) return;
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
      // יחידה והערה: undefined = לא השתנה, null = ניקוי
      if (unit !== undefined && unit !== (editingItem.unit ?? null)) {
        updates.unit = unit;
      }
      if (note !== undefined && note !== (editingItem.note ?? null)) {
        updates.note = note;
      }
      const updated = await updateItem(editingItem.id, updates);
      setItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)));
      setEditingItem(null);
      setModalVisible(false);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      if (failedOffline(error)) return;
      if (error.status === 400 && error.message) {
        // למשל מחלקה שנמחקה בינתיים: מציגים את הודעת השרת וטוענים מחדש את
        // המחלקות, כדי שהחלון לא ימשיך להציע אותה
        Alert.alert('שגיאה', error.message);
        loadCategories();
        return;
      }
      Alert.alert('שגיאה', 'לא הצלחנו לערוך את המוצר');
    } finally {
      endMutation();
    }
  };

  // יצירת מחלקה מותאמת. מחזיר את המחלקה שנוצרה (או undefined בכישלון)
  const handleCreateCategory = async name => {
    if (blockIfOffline()) return undefined;
    commitPendingDelete();
    actionSeq.current++;
    startMutation();
    try {
      const created = await createListCategory(currentListId, name);
      setCustomCategories(prev => [...prev, created]);
      return created;
    } catch (error) {
      if (error.sessionExpired) return undefined;
      if (failedOffline(error)) return undefined;
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
    if (blockIfOffline()) return false;
    commitPendingDelete();
    actionSeq.current++;
    startMutation();
    try {
      await deleteListCategory(currentListId, category.id);
    } catch (error) {
      // 404 - כבר נמחקה (למשל על ידי בן משפחה): נחשב הצלחה
      if (error.status !== 404) {
        if (error.sessionExpired) return false;
        if (failedOffline(error)) return false;
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
    if (blockIfOffline()) return;
    // המחיקה הממתינה מסתיימת לפני הבקשה הקבוצתית, כדי שלא יהיה מרוץ ביניהן
    await commitPendingDelete();
    // המחיקה הממתינה נכשלה ברשת: כבר הוצגה הודעה ואין שולחים כלום
    if (isOfflineRef.current) return;
    actionSeq.current++;
    hideBar();
    startMutation();
    try {
      await request(currentListId);
      setItems(applyLocally);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      if (failedOffline(error)) return;
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
    if (blockIfOffline()) return;
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
    dragBlocked.current = blockIfOffline();
    if (dragBlocked.current) return;
    commitPendingDelete();
    actionSeq.current++;
    startMutation(); // גרירה נחשבת תחילת שינוי - רענון שבדרך נזרק
    setIsDragging(true);
  };

  const handleDragEnd = async ({ data }) => {
    if (dragBlocked.current) {
      // נחסמה בתחילתה: הסדר לא משתנה ושום דבר לא נשלח
      dragBlocked.current = false;
      return;
    }
    setIsDragging(false);
    if (blockIfOffline()) {
      // הרשת נפלה באמצע הגרירה: לא מחילים את הסדר החדש
      endMutation();
      return;
    }
    // מוצר מוסתר (מחיקה בדרך) נשאר במצב, כדי שיוצג שוב אם המחיקה תיכשל
    setItems(prev => [
      ...data,
      ...prev.filter(item => item.purchased || hiddenIds.current.has(item.id)),
    ]);
    const reorderedData = data.map((item, index) => ({
      id: item.id,
      position: index,
    }));
    try {
      await reorderItems(reorderedData);
    } catch (error) {
      failedOffline(error);
      console.log('Failed to save order to server');
    } finally {
      endMutation();
    }
  };

  const openEditModal = item => {
    if (blockIfOffline()) return;
    commitPendingDelete();
    setEditingItem(item);
    setModalVisible(true);
  };

  // המחלקה והצבע של כל מוצר מחושבים רק כשהמוצרים או המחלקות משתנים (לא בכל ציור מחדש).
  // הנקודה הצבעונית מוזנת לשורת המוצר דרך categoryColor
  const resolvedItems = useMemo(
    () =>
      items.map(item => {
        const cat = resolveCategory(item, customCategories, layout);
        return { item: { ...item, categoryColor: cat.color }, cat };
      }),
    [items, customCategories, layout],
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

  // המסלול לפי מחלקות: רק מחלקות עם מוצרים, בסדר הפריסה של הרשימה ("אחר" תמיד אחרונה).
  // המונה סופר גם מה שנקנה, אבל המוצרים שנקנו מופיעים רק בחלק התחתון
  const departmentPlan = categoryMode ? buildRoute(visibleResolved) : null;
  const departmentCount = departmentPlan ? departmentPlan.stations.length : 0;

  const subtitle =
    unpurchasedItems.length > 0
      ? `${unpurchasedItems.length} מוצרים לקנייה`
      : visibleItems.length > 0
      ? 'כל המוצרים נקנו 🎉'
      : 'הרשימה עדיין ריקה';
  const departmentsLabel =
    departmentCount === 1 ? 'מחלקה אחת' : `${departmentCount} מחלקות`;

  // שורת מוצר במסלול (רגילה, או גדולה בכרטיס "עכשיו במחלקה").
  // כל הפעולות עוברות דרך המסך: חסימה במצב לא מקוון, פס ביטול ומשמר השינויים
  const renderRouteRow = (item, { variant } = {}) => (
    <ShoppingListItem
      item={item}
      variant={variant}
      onTogglePurchased={() => handleTogglePurchased(item)}
      onEdit={() => openEditModal(item)}
      onDelete={() => handleDeleteItem(item.id)}
      onUpdateAmount={newAmount => handleUpdateAmount(item, newAmount)}
      isActive={false}
      showAddedBy={memberCount > 1}
      currentUsername={currentUsername}
      disabled={isOffline}
    />
  );

  const listHeader = (
    <View>
      {/* אין תיבת טיפ (אין בעיצוב, והייתה נראית כפס ריק מתחת למתג המיון).
          העיגול, הפח והשם מסבירים את עצמם ויש להם תוויות נגישות */}
      {/* הכותרת "מוצרים לקנייה" מופיעה במצב ידני כשיש מוצרים */}
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
      showAddedBy={memberCount > 1}
      currentUsername={currentUsername}
      disabled={isOffline}
      blockIfOffline={blockIfOffline}
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
            accessibilityRole="button"
            accessibilityLabel="חזרה לרשימות"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerEyebrow}>ניהול מוצרים ברשימה</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setMode(isDark ? 'light' : 'dark')}
              style={styles.themeToggle}
              activeOpacity={0.8}
              testID="theme_toggle"
              accessibilityLabel={isDark ? 'מצב בהיר' : 'מצב כהה'}
              accessibilityRole="button"
            >
              <Icon
                name={isDark ? 'white-balance-sunny' : 'weather-night'}
                size={22}
                color={colors.text.inverse}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (blockIfOffline()) return;
                setMembersVisible(true);
              }}
              style={styles.membersButton}
              activeOpacity={0.8}
              testID="members_button"
              accessibilityLabel="משתתפים ברשימה"
              accessibilityValue={
                memberCount !== null
                  ? { text: `${memberCount} משתתפים` }
                  : undefined
              }
              accessibilityRole="button"
            >
              <Icon
                name="account-group"
                size={22}
                color={colors.text.inverse}
              />
              {memberCount !== null && (
                <Text style={styles.membersButtonText}>{memberCount}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* טבעת ההתקדמות לצד שם הרשימה: כמה נקנו מתוך כל המוצרים */}
        <View style={styles.headerMain}>
          <ProgressRing
            done={purchasedItems.length}
            total={visibleItems.length}
          />
          <View style={styles.headerTexts}>
            <Text style={styles.mainTitle} numberOfLines={1}>
              {listName || 'רשימת קניות'}
            </Text>
            <Text testID="list_subtitle" style={styles.headerSubtitle}>
              {departmentCount > 0
                ? `${subtitle} · ${departmentsLabel}`
                : subtitle}
            </Text>
          </View>
        </View>
      </View>

      {/* תיבת ההוספה נשארת קבועה כדי שתמיד יהיה אפשר להוסיף מוצרים */}
      <View style={styles.addCard}>
        <AddItemInput
          onAdd={handleAddItem}
          listId={currentListId}
          editable={!isOffline}
        />
      </View>

      <OfflineBanner visible={isOffline} />

      <View style={styles.sortSegments}>
        {[
          { mode: 'manual', label: 'סדר ידני', icon: 'drag-horizontal-variant' },
          { mode: 'category', label: 'לפי מחלקות', icon: 'shape-outline' },
        ].map(({ mode, label, icon }) => {
          const selected = (mode === 'category') === categoryMode;
          return (
            <TouchableOpacity
              key={mode}
              testID={`sort_segment_${mode}`}
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.sortSegment,
                selected && styles.sortSegmentActive,
              ]}
              onPress={() => selectSortMode(mode)}
              activeOpacity={0.8}
            >
              <Icon
                name={icon}
                size={18}
                color={selected ? colors.text.inverse : colors.primaryText}
              />
              <Text
                style={[
                  styles.sortSegmentText,
                  selected && styles.sortSegmentTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {categoryMode ? (
        // במצב מחלקות אין גרירה: מסלול של מחלקות עם כרטיס "עכשיו במחלקה"
        <ScrollView
          testID="category_list"
          contentContainerStyle={[styles.listContent, styles.routeContent]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              progressBackgroundColor={colors.raised}
            />
          }
        >
          {listHeader}
          <DepartmentRoute
            plan={departmentPlan}
            renderItem={renderRouteRow}
          />
          {purchasedFooter}
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={unpurchasedItems}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onDragBegin={handleDragBegin}
          onDragEnd={handleDragEnd}
          dragHitSlop={DRAG_HIT_SLOP}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              progressBackgroundColor={colors.raised}
            />
          }
          ListHeaderComponent={listHeader}
          renderItem={({ item, drag, isActive }) => (
            <ShoppingListItem
              item={item}
              onTogglePurchased={() => handleTogglePurchased(item)}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDeleteItem(item.id)}
              onUpdateAmount={newAmount => handleUpdateAmount(item, newAmount)}
              onDrag={isOffline ? undefined : drag}
              isActive={isActive}
              showAddedBy={memberCount > 1}
              currentUsername={currentUsername}
              disabled={isOffline}
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
        layout={layout}
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
