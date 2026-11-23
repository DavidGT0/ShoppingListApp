import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { styles } from './EditItemModal.styles';
import { BUILTIN_CATEGORIES, customKey } from '../../services/categories';

const MAX_CATEGORY_NAME = 30;

// הפניה למחלקה מותאמת שכבר לא קיימת נחשבת אוטומטי
const initialSelection = (item, categories) => {
  const value = item.category || null;
  if (!value) return null;
  if (BUILTIN_CATEGORIES.some(c => c.key === value)) return value;
  return categories.some(c => customKey(c.id) === value) ? value : null;
};

const EditItemModal = ({
  visible,
  item,
  onSave,
  onClose,
  categories = [],
  onCreateCategory,
  onDeleteCategory,
}) => {
  const [editName, setEditName] = useState('');
  // null = אוטומטי; אחרת מפתח מובנה או custom:<id>
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  // בלי נגיעה בצ'יפ המחלקה לא נשלחת, כך שעריכת שם בלבד לא דורסת בחירה ידנית
  const [touched, setTouched] = useState(false);

  // בכל פתיחה של החלון - טוענים מחדש את השם והמחלקה השמורים של המוצר
  // (גם כשפותחים שוב את אותו מוצר אחרי ביטול, כדי שלא יוצג טקסט שלא נשמר)
  useEffect(() => {
    if (visible && item) {
      setEditName(item.name);
      setSelected(initialSelection(item, categories));
      setTouched(false);
      setAdding(false);
      setNewName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating || !onCreateCategory) return;
    setCreating(true);
    try {
      const created = await onCreateCategory(name);
      if (created && created.id != null) {
        setSelected(customKey(created.id));
        setTouched(true);
        setAdding(false);
        setNewName('');
      }
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = category => {
    Alert.alert(
      'מחיקת מחלקה',
      `למחוק את המחלקה "${category.name}"? המוצרים שבה יחזרו לסיווג אוטומטי.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            const ok = await onDeleteCategory?.(category);
            // רק אחרי מחיקה מוצלחת הבחירה מתאפסת
            if (ok) {
              setSelected(prev =>
                prev === customKey(category.id) ? null : prev,
              );
            }
          },
        },
      ],
    );
  };

  const renderChip = (id, label, value, color, extra = {}) => {
    const active = selected === value;
    return (
      <TouchableOpacity
        key={id}
        testID={`category_chip_${id}`}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => {
          setSelected(value);
          setTouched(true);
        }}
        activeOpacity={0.8}
        {...extra}
      >
        {color ? (
          <View style={[styles.chipDot, { backgroundColor: color }]} />
        ) : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ערוך מוצר</Text>
          <TextInput
            style={styles.modalInput}
            value={editName}
            onChangeText={setEditName}
            autoFocus
          />

          <Text style={styles.sectionTitle}>מחלקה</Text>
          <ScrollView style={styles.chipsScroll}>
            <View style={styles.chipsRow}>
              {renderChip('auto', 'אוטומטי', null, null)}
              {BUILTIN_CATEGORIES.map(c =>
                renderChip(c.key, c.name, c.key, c.color),
              )}
              {categories.map(c =>
                renderChip(customKey(c.id), c.name, customKey(c.id), c.color, {
                  onLongPress: () => confirmDelete(c),
                }),
              )}
              <TouchableOpacity
                testID="category_chip_new"
                style={[styles.chip, styles.chipNew]}
                onPress={() => setAdding(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText}>+ מחלקה חדשה</Text>
              </TouchableOpacity>
            </View>
            {adding && (
              <View style={styles.newCategoryRow}>
                <TextInput
                  testID="new_category_input"
                  style={[styles.modalInput, styles.newCategoryInput]}
                  value={newName}
                  onChangeText={setNewName}
                  maxLength={MAX_CATEGORY_NAME}
                  placeholder="שם המחלקה"
                  autoFocus
                />
                <TouchableOpacity
                  testID="new_category_save"
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreate}
                >
                  <Text style={styles.saveButtonText}>הוסף</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="edit_save_button"
              style={[styles.modalButton, styles.saveButton]}
              onPress={() =>
                onSave({
                  name: editName,
                  category: touched ? selected : undefined,
                })
              }
            >
              <Text style={styles.saveButtonText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditItemModal;
