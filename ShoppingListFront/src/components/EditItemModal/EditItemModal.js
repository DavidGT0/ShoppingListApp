import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { styles } from './EditItemModal.styles';

const EditItemModal = ({ visible, item, onSave, onClose }) => {
  const [editName, setEditName] = useState('');

  // מעדכן את הטקסט בחלון ברגע שמעבירים אליו מוצר לעריכה
  useEffect(() => {
    if (item) {
      setEditName(item.name);
    }
  }, [item]);

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
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => onSave(editName)}
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
