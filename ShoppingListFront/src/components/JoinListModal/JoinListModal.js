import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { joinListByCode } from '../../services/api';
import { extractInviteCode } from '../../services/inviteCode';
import { makeStyles } from './JoinListModal.styles';
import { useStyles } from '../../theme/ThemeContext';

const JoinListModal = ({ visible, onClose, onJoined }) => {
  const styles = useStyles(makeStyles);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // בכל פתיחה של החלון מתחילים משדה ריק
  useEffect(() => {
    if (visible) {
      setCode('');
    }
  }, [visible]);

  const handleJoin = async () => {
    if (submitting) return;
    const cleanCode = extractInviteCode(code);
    if (!cleanCode) {
      Alert.alert('שגיאה', 'אנא הזן קוד הזמנה');
      return;
    }

    setSubmitting(true);
    try {
      const list = await joinListByCode(cleanCode);
      onJoined(list);
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', error.message);
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.modalTitle}>הצטרפות לרשימה</Text>
          <TextInput
            style={styles.modalInput}
            value={code}
            onChangeText={setCode}
            placeholder="הדבק כאן את ההודעה או את הקוד"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            testID="join_code_input"
            accessibilityLabel="קוד הזמנה"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="ביטול"
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleJoin}
              testID="join_submit_button"
              accessibilityLabel="הצטרפות לרשימה"
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>הצטרף</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default JoinListModal;
