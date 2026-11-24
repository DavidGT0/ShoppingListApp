import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import EmojiPicker from '../../components/EmojiPicker/EmojiPicker';
import OfflineBanner, {
  showOfflineBlockedAlert,
} from '../../components/OfflineBanner/OfflineBanner';
import {
  getListCategories,
  saveCategoryLayout,
  createListCategory,
  deleteListCategory,
} from '../../services/api';
import { normalizeCategories } from '../../services/categories';
import { loadWithCache, cacheKeys } from '../../services/offlineCache';
import {
  OTHER_KEY,
  DEFAULT_ICON,
  MAX_NAME,
  buildEditorState,
  layoutPayload,
  displayName,
  displayIcon,
  nameTaken,
  nameOverride,
  moveKey,
  newCustomRow,
} from './departmentsModel';
import { makeStyles } from './EditDepartmentsScreen.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';

const OFFLINE_HINT = 'לא זמין ללא חיבור לאינטרנט';
const TAKEN = ['שים לב', 'המחלקה כבר קיימת ברשימה'];
// הזזה בצעד אחד מקורא המסך (גרירה קשה עם TalkBack)
const MOVE_ACTIONS = [
  { name: 'moveUp', label: 'הזזה למעלה' },
  { name: 'moveDown', label: 'הזזה למטה' },
];
const HANDLE_HIT_SLOP = { top: 6, bottom: 6, left: 8, right: 8 };
const NO_KEYS = [];

// עריכת המחלקות של רשימה: סדר (גרירה), שם ואייקון, הוספה ומחיקה של מחלקות שנוספו.
// הסדר, השמות והאייקונים נשמרים בבקשת PUT אחת ב"סיום". הוספה ומחיקה חלות מיד (כמו היום).
// משותף לכל המשתתפים ברשימה ומגיע אליהם דרך הרענון החי
const EditDepartmentsScreen = ({ route, navigation }) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { listId, listName, usedKeys = NO_KEYS } = route?.params || {};

  const [loading, setLoading] = useState(true);
  // כל המפתחות של הפריסה, גם מחלקות שלא מוצגות: כולם נשלחים בשמירה
  const [allKeys, setAllKeys] = useState([]);
  const [rows, setRows] = useState({});
  // סדר המחלקות המוצגות (בלי "אחר", שתמיד אחרונה)
  const [order, setOrder] = useState([]);
  // { key, text, icon } - שורה בעריכת שם/אייקון
  const [editing, setEditing] = useState(null);
  // { text, icon } - טופס מחלקה חדשה
  const [adding, setAdding] = useState(null);
  // 'edit' | 'add' - בשביל מי פתוח בוחר האייקונים
  const [picker, setPicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  // מצב לא מקוון (כמו במסך הרשימה): ה-ref משקף את הערך לפונקציות שנתפסו קודם
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false);
  const setOffline = value => {
    isOfflineRef.current = value;
    setIsOffline(value);
  };
  // true אם במצב לא מקוון (ואז מציג את ההודעה). רץ לפני כל שינוי
  const blockIfOffline = () => {
    if (!isOfflineRef.current) return false;
    showOfflineBlockedAlert();
    return true;
  };
  // שגיאת רשת בבקשת שינוי: עוברים למצב לא מקוון ומציגים את ההודעה פעם אחת
  const failedOffline = error => {
    if (!error?.network) return false;
    const wasOffline = isOfflineRef.current;
    setOffline(true);
    if (!wasOffline) showOfflineBlockedAlert();
    return true;
  };

  // משמר התשובות הישנות: טעינה שחוזרת אחרי שינוי שלי נזרקת
  const mutationVersion = useRef(0);
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
    let cancelled = false;
    const version = mutationVersion.current;
    const load = async () => {
      try {
        const { data, fromCache } = await loadWithCache(
          () => getListCategories(listId),
          cacheKeys.categories(listId),
        );
        if (cancelled) return;
        if (pendingMutations.current > 0 || version !== mutationVersion.current) {
          return;
        }
        const state = buildEditorState(normalizeCategories(data), usedKeys);
        setAllKeys(state.allKeys);
        setRows(state.rows);
        setOrder(state.order);
        if (fromCache) setOffline(true);
      } catch (error) {
        if (cancelled || error.sessionExpired) return;
        if (error.network) {
          // אין רשת וגם אין עותק שמור: אין מה לערוך
          showOfflineBlockedAlert();
        } else if (error.status !== 403 && error.status !== 404) {
          Alert.alert('שגיאה', error.message || 'לא הצלחנו לטעון את המחלקות');
        }
        // 403/404: מסך הרשימה מציג את ההודעה כשהוא מתרענן
        navigation.goBack();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const offlineHint = isOffline ? OFFLINE_HINT : undefined;

  // השורות אחרי אישור השם שבעריכה, או null אם השם כבר תפוס
  const applyEdit = current => {
    if (!editing || !current[editing.key]) return current;
    const row = current[editing.key];
    const name = nameOverride(row, editing.text);
    if (nameTaken(current, name || row.defaultName, row.key)) {
      Alert.alert(...TAKEN);
      return null;
    }
    return { ...current, [row.key]: { ...row, name, icon: editing.icon } };
  };

  const startEdit = key => {
    if (blockIfOffline()) return;
    const next = applyEdit(rows);
    if (!next) return;
    setRows(next);
    const row = next[key];
    setEditing({ key, text: displayName(row), icon: row.icon });
  };

  const confirmEdit = () => {
    const next = applyEdit(rows);
    if (!next) return;
    setRows(next);
    setEditing(null);
  };

  const openPicker = target => {
    if (blockIfOffline()) return;
    setPicker(target);
  };

  const selectEmoji = emoji => {
    if (picker === 'add') setAdding(prev => (prev ? { ...prev, icon: emoji } : prev));
    else setEditing(prev => (prev ? { ...prev, icon: emoji } : prev));
    setPicker(null);
  };

  const resetEmoji = () => {
    setEditing(prev => (prev ? { ...prev, icon: null } : prev));
    setPicker(null);
  };

  const moveRow = (key, actionName) => {
    if (blockIfOffline()) return;
    const delta = actionName === 'moveUp' ? -1 : actionName === 'moveDown' ? 1 : 0;
    if (delta) setOrder(prev => moveKey(prev, key, delta));
  };

  const openAdd = () => {
    if (blockIfOffline()) return;
    setAdding({ text: '', icon: DEFAULT_ICON });
  };

  const submitAdd = async () => {
    if (!adding || creatingRef.current) return;
    const name = adding.text.trim();
    if (!name) return;
    if (blockIfOffline()) return;
    if (nameTaken(rows, name)) {
      Alert.alert(...TAKEN);
      return;
    }
    const icon = adding.icon || DEFAULT_ICON;
    creatingRef.current = true;
    setCreating(true);
    startMutation();
    try {
      const created = await createListCategory(listId, name, icon);
      const row = newCustomRow({ ...created, icon: created.icon || icon });
      setRows(prev => ({ ...prev, [row.key]: row }));
      setAllKeys(prev => [
        ...prev.filter(k => k !== OTHER_KEY && k !== row.key),
        row.key,
        OTHER_KEY,
      ]);
      setOrder(prev => [...prev.filter(k => k !== row.key), row.key]);
      setAdding(null);
    } catch (error) {
      if (error.sessionExpired) return;
      if (failedOffline(error)) return;
      if (error.status === 403 || error.status === 404) {
        navigation.goBack();
        return;
      }
      Alert.alert('שגיאה', error.message || 'לא הצלחנו ליצור את המחלקה');
    } finally {
      creatingRef.current = false;
      setCreating(false);
      endMutation();
    }
  };

  const deleteDepartment = async row => {
    if (blockIfOffline()) return;
    startMutation();
    try {
      await deleteListCategory(listId, row.catId);
    } catch (error) {
      // 404 - כבר נמחקה (למשל על ידי משתתף אחר): נחשב הצלחה
      if (error.status !== 404) {
        if (error.sessionExpired) return;
        if (failedOffline(error)) return;
        if (error.status === 403) {
          navigation.goBack();
          return;
        }
        Alert.alert('שגיאה', 'לא הצלחנו למחוק את המחלקה');
        return;
      }
    } finally {
      endMutation();
    }
    setOrder(prev => prev.filter(k => k !== row.key));
    setAllKeys(prev => prev.filter(k => k !== row.key));
    setRows(prev => {
      const next = { ...prev };
      delete next[row.key];
      return next;
    });
    setEditing(prev => (prev?.key === row.key ? null : prev));
  };

  // לחיצה ארוכה על מחלקה שנוספה: אישור עם השם המוצג (שינוי השם בפריסה), ואז מחיקה
  const requestDelete = key => {
    if (blockIfOffline()) return;
    const row = rows[key];
    if (!row?.isCustom) return;
    Alert.alert(
      'מחיקת מחלקה',
      `למחוק את המחלקה "${displayName(row)}"? המוצרים שבה יחזרו לסיווג אוטומטי.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteDepartment(row),
        },
      ],
    );
  };

  // "סיום": PUT אחד עם כל המפתחות, וחזרה רק אחרי שהשמירה הצליחה
  const handleDone = async () => {
    if (savingRef.current) return;
    if (blockIfOffline()) return;
    let nextRows = rows;
    if (editing) {
      nextRows = applyEdit(rows);
      if (!nextRows) return;
      setRows(nextRows);
      setEditing(null);
    }
    savingRef.current = true;
    setSaving(true);
    startMutation();
    try {
      await saveCategoryLayout(listId, layoutPayload(allKeys, order, nextRows));
      // נשאר "שומר" עד שהמסך נסגר, כדי שלחיצה נוספת לא תשלח שוב
      navigation.goBack();
    } catch (error) {
      savingRef.current = false;
      setSaving(false);
      if (error.sessionExpired) return;
      if (failedOffline(error)) return;
      if (error.status === 403 || error.status === 404) {
        navigation.goBack();
        return;
      }
      // 409 (שמירה במקביל) ו-400: הודעת השרת, ונשארים במסך
      Alert.alert('שגיאה', error.message || 'לא הצלחנו לשמור את המחלקות');
    } finally {
      endMutation();
    }
  };

  const renderRow = (row, { drag, isActive = false, pinned = false } = {}) => {
    const isEditing = editing?.key === row.key;
    const name = displayName(row);
    return (
      <View testID={`department_row_${row.key}`}>
        <View
          style={[
            styles.row,
            isEditing && styles.rowEditing,
            isActive && styles.rowActive,
          ]}
        >
          {pinned ? (
            <View style={styles.handleSpacer} />
          ) : (
            <GHTouchableOpacity
              testID={`department_drag_${row.key}`}
              onLongPress={() => {
                if (blockIfOffline()) return;
                drag();
              }}
              delayLongPress={150}
              disabled={isActive}
              hitSlop={HANDLE_HIT_SLOP}
              style={styles.handle}
              accessibilityRole="button"
              accessibilityLabel={`גרירת המחלקה ${name}`}
              accessibilityHint={offlineHint || 'לחיצה כפולה והחזקה כדי לגרור'}
              accessibilityActions={MOVE_ACTIONS}
              onAccessibilityAction={e => moveRow(row.key, e.nativeEvent.actionName)}
            >
              <Icon name="drag-vertical" size={22} color={colors.text.secondary} />
            </GHTouchableOpacity>
          )}

          {isEditing ? (
            <>
              <TouchableOpacity
                testID={`department_icon_${row.key}`}
                onPress={() => openPicker('edit')}
                style={styles.iconButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`בחירת אייקון, עכשיו ${editing.icon || row.defaultIcon}`}
              >
                <Text style={styles.icon}>{editing.icon || row.defaultIcon}</Text>
              </TouchableOpacity>
              <TextInput
                testID="department_name_input"
                value={editing.text}
                onChangeText={text => setEditing(prev => ({ ...prev, text }))}
                placeholder={row.defaultName}
                placeholderTextColor={colors.placeholder}
                maxLength={MAX_NAME}
                style={styles.nameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmEdit}
                accessibilityLabel={`שם המחלקה ${row.defaultName}`}
              />
              <TouchableOpacity
                testID="department_name_confirm"
                onPress={confirmEdit}
                style={styles.roundButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="אישור השם והאייקון"
              >
                <Icon name="check" size={24} color={colors.primaryText} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="department_name_cancel"
                onPress={() => setEditing(null)}
                style={styles.roundButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="ביטול העריכה"
              >
                <Icon name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.icon}>{displayIcon(row)}</Text>
              {row.isCustom ? (
                <TouchableOpacity
                  testID={`department_name_${row.key}`}
                  onLongPress={() => requestDelete(row.key)}
                  delayLongPress={500}
                  style={styles.nameArea}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  accessibilityHint={offlineHint || 'לחיצה ארוכה למחיקת המחלקה'}
                >
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View testID={`department_name_${row.key}`} style={styles.nameArea}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {pinned ? <Text style={styles.pinnedText}>תמיד אחרונה</Text> : null}
                </View>
              )}
              <TouchableOpacity
                testID={`department_edit_${row.key}`}
                onPress={() => startEdit(row.key)}
                style={styles.roundButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`עריכת השם והאייקון של ${name}`}
                accessibilityHint={offlineHint}
              >
                <Icon name="pencil-outline" size={20} color={colors.primaryText} />
              </TouchableOpacity>
            </>
          )}
        </View>
        {isEditing ? (
          <Text style={styles.editHint}>
            {`השם המקורי: ${row.defaultName}. שדה ריק מחזיר אותו.`}
          </Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const data = order.map(key => rows[key]).filter(Boolean);
  const otherRow = rows[OTHER_KEY];

  const footer = (
    <View>
      {otherRow ? renderRow(otherRow, { pinned: true }) : null}
      {adding ? (
        <View style={[styles.row, styles.addRow]}>
          <TouchableOpacity
            testID="new_department_icon"
            onPress={() => openPicker('add')}
            style={styles.iconButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`בחירת אייקון למחלקה החדשה, עכשיו ${adding.icon}`}
          >
            <Text style={styles.icon}>{adding.icon}</Text>
          </TouchableOpacity>
          <TextInput
            testID="new_department_input"
            value={adding.text}
            onChangeText={text => setAdding(prev => ({ ...prev, text }))}
            placeholder="שם המחלקה"
            placeholderTextColor={colors.placeholder}
            maxLength={MAX_NAME}
            style={styles.nameInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submitAdd}
            accessibilityLabel="שם המחלקה החדשה"
          />
          <TouchableOpacity
            testID="new_department_save"
            onPress={submitAdd}
            style={styles.addSave}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="הוספת המחלקה"
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.addSaveText}>הוסף</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            testID="new_department_cancel"
            onPress={() => setAdding(null)}
            style={styles.roundButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="ביטול ההוספה"
          >
            <Icon name="close" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          testID="add_department_button"
          onPress={openAdd}
          style={styles.addButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="הוספת מחלקה חדשה"
          accessibilityHint={offlineHint}
        >
          <Text style={styles.addButtonText}>+ מחלקה חדשה</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        testID="header_gradient"
        colors={colors.headerGradient}
        useAngle
        angle={135}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            testID="edit_departments_back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="חזרה בלי לשמור"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="edit_departments_done"
            onPress={handleDone}
            style={styles.doneButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="סיום"
            accessibilityHint={offlineHint || 'שמירת הסדר, השמות והאייקונים'}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.doneText}>סיום</Text>
            )}
          </TouchableOpacity>
        </View>
        {listName ? (
          <Text style={styles.headerEyebrow} numberOfLines={1}>
            {listName}
          </Text>
        ) : null}
        <Text
          testID="edit_departments_title"
          style={styles.title}
          accessibilityRole="header"
        >
          עריכת מחלקות
        </Text>
      </LinearGradient>

      <OfflineBanner visible={isOffline} />

      <DraggableFlatList
        testID="edit_departments_list"
        data={data}
        keyExtractor={row => row.key}
        onDragEnd={({ data: next }) => setOrder(next.map(row => row.key))}
        renderItem={({ item, drag, isActive }) => renderRow(item, { drag, isActive })}
        ListHeaderComponent={
          <Text style={styles.hint}>
            גוררים בידית שבצד כדי לשנות את הסדר, ולוחצים על ✎ כדי לשנות שם או
            אייקון. לחיצה ארוכה על מחלקה שהוספתם מוחקת אותה. הסדר נשמר לרשימה
            הזו, וכל המשתתפים ברשימה רואים אותו.
          </Text>
        }
        ListFooterComponent={footer}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      <EmojiPicker
        visible={!!picker}
        selected={
          picker === 'add'
            ? adding?.icon
            : editing?.icon || rows[editing?.key]?.defaultIcon
        }
        onSelect={selectEmoji}
        onReset={picker === 'edit' ? resetEmoji : undefined}
        onClose={() => setPicker(null)}
      />
    </View>
  );
};

export default EditDepartmentsScreen;
