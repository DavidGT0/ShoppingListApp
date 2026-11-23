import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  getListMembers,
  getInviteCode,
  resetInviteCode,
  removeListMember,
  leaveList,
} from '../../services/api';
import { styles } from './MembersModal.styles';

const MembersModal = ({
  visible,
  listId,
  listName,
  isOwner,
  onClose,
  onLeft,
}) => {
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  // ה-ref חוסם גם לחיצה כפולה מהירה לפני שה-state הספיק להתעדכן
  const busyRef = useRef(false);

  // מריץ פעולה מול השרת; בזמן שהיא רצה לחיצות נוספות מתעלמות
  const runGuarded = async action => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const showError = error => {
    if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
    Alert.alert('שגיאה', error.message);
  };

  const loadMembers = async () => {
    try {
      const data = await getListMembers(listId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      showError(error);
    }
  };

  // בכל פתיחה של החלון טוענים מחדש את רשימת המשתתפים
  useEffect(() => {
    if (visible && listId) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, listId]);

  const handleInvite = () =>
    runGuarded(async () => {
      try {
        const code = await getInviteCode(listId);
        const message =
          `הצטרפו לרשימת הקניות "${listName}" שלי ב-ShopLi 🛒\n` +
          `באפליקציה: הרשימות שלי ← "הצטרפות עם קוד" ← הקוד: ${code}`;
        // סגירת חלון השיתוף על ידי המשתמש אינה שגיאה - לא מציגים התראה
        await Share.share({ message });
      } catch (error) {
        showError(error);
      }
    });

  const handleResetCode = () => {
    Alert.alert('קוד הזמנה חדש', 'הקוד הקודם יפסיק לעבוד. להמשיך?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'צור קוד חדש',
        style: 'destructive',
        onPress: () =>
          runGuarded(async () => {
            try {
              await resetInviteCode(listId);
              Alert.alert(
                'בוצע',
                'נוצר קוד הזמנה חדש. לחצו "הזמן בני משפחה" כדי לשתף אותו.',
              );
            } catch (error) {
              showError(error);
            }
          }),
      },
    ]);
  };

  const handleRemove = member => {
    Alert.alert(
      'הסרת משתתף',
      `להסיר את ${member.username} מהרשימה?\n` +
        'כדי שלא יוכל להצטרף שוב עם אותו קוד, צרו קוד חדש',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: () =>
            runGuarded(async () => {
              try {
                await removeListMember(listId, member.id);
                await loadMembers();
              } catch (error) {
                showError(error);
              }
            }),
        },
      ],
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'עזיבת הרשימה',
      'לעזוב את הרשימה? כדי לחזור תצטרכו קוד הזמנה.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'עזוב',
          style: 'destructive',
          onPress: () =>
            runGuarded(async () => {
              try {
                await leaveList(listId);
                onLeft();
              } catch (error) {
                showError(error);
              }
            }),
        },
      ],
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
          <Text style={styles.modalTitle}>משתתפים ברשימה</Text>
          <ScrollView>
            {members.map(member => (
              <View key={member.id} style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {member.username}
                  {member.is_owner && (
                    <Text style={styles.ownerTag}> (בעלים)</Text>
                  )}
                </Text>
                {isOwner && !member.is_owner && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemove(member)}
                    disabled={busy}
                    testID={`remove_member_${member.id}`}
                    accessibilityLabel={`הסר את ${member.username}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy }}
                  >
                    <Text style={styles.removeButtonText}>הסר</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            {isOwner ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.primaryButton]}
                  onPress={handleInvite}
                  disabled={busy}
                  testID="invite_button"
                  accessibilityLabel="הזמן בני משפחה"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>הזמן בני משפחה</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.secondaryButton]}
                  onPress={handleResetCode}
                  disabled={busy}
                  testID="reset_code_button"
                  accessibilityLabel="צור קוד הזמנה חדש"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.secondaryButtonText}>צור קוד חדש</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalButton, styles.dangerButton]}
                onPress={handleLeave}
                disabled={busy}
                testID="leave_list_button"
                accessibilityLabel="עזיבת הרשימה"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
              >
                <Text style={styles.dangerButtonText}>עזוב רשימה</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.secondaryButton]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="סגירה"
            >
              <Text style={styles.secondaryButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MembersModal;
