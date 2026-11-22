import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { styles } from './SettingsScreen.styles';
import {
  logout,
  getCurrentUser,
  changePassword,
  deleteAccount,
} from '../../services/auth';
import { MIN_PASSWORD_LENGTH } from '../../services/validation';

const SettingsScreen = ({ onLogout }) => {
  const [user, setUser] = useState(null);

  // States עבור שינוי סיסמה
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // States עבור מחיקת חשבון
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  // פונקציית טיפול בשינוי סיסמה
  const handleSubmitPasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות החדשות אינן תואמות');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'שגיאה',
        `הסיסמה החדשה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`,
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('הצלחה', 'הסיסמה שונתה בהצלחה');
      // איפוס הטופס וסגירתו
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', error.message || 'אירעה שגיאה בשינוי הסיסמה');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('התנתקות', 'האם אתה בטוח שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתק',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onLogout();
        },
      },
    ]);
  };

  const closeDeleteForm = () => {
    setShowDeleteForm(false);
    setDeletePassword('');
  };

  // מחיקת חשבון: סיסמה + אישור אחרון, ואז חזרה למסך הכניסה
  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('שגיאה', 'נא להזין את הסיסמה שלך לאישור');
      return;
    }

    Alert.alert(
      'מחיקת חשבון',
      'החשבון, כל הרשימות שלך וכל המוצרים שבהן יימחקו לצמיתות. לא ניתן לבטל פעולה זו.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק לצמיתות',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount(deletePassword);
              Alert.alert('החשבון נמחק', 'כל המידע שלך נמחק בהצלחה.');
              onLogout();
            } catch (error) {
              if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
              Alert.alert('שגיאה', error.message || 'מחיקת החשבון נכשלה');
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* ההגדרות הן לשונית בתפריט התחתון - אין צורך בכפתור "חזור" */}
      <View style={styles.header}>
        <Text style={styles.title}>הגדרות</Text>
      </View>

      {user && (
        <View style={styles.userSection}>
          <Text style={styles.sectionTitle}>פרטי משתמש</Text>
          <View style={styles.userInfo}>
            <Text style={styles.label}>שם משתמש:</Text>
            <Text style={styles.value}>{user.username}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.label}>אימייל:</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
        </View>
      )}

      {/* אזור אבטחה - שינוי סיסמה */}
      <View style={styles.userSection}>
        <Text style={styles.sectionTitle}>אבטחה</Text>

        {!showPasswordForm ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPasswordForm(true)}
          >
            <Text style={styles.actionButtonText}>שנה סיסמה</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.input}
              placeholder="סיסמה נוכחית"
              placeholderTextColor="#888"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="סיסמה חדשה"
              placeholderTextColor="#888"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="אימות סיסמה חדשה"
              placeholderTextColor="#888"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmitPasswordChange}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>שמור סיסמה</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isChangingPassword}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>התנתק</Text>
      </TouchableOpacity>

      {/* מחיקת חשבון (דרישה של Google Play) */}
      <View style={[styles.userSection, styles.dangerSection]}>
        <Text style={styles.sectionTitle}>מחיקת חשבון</Text>
        <Text style={styles.dangerText}>
          מחיקת החשבון תמחק לצמיתות את המשתמש שלך, את כל הרשימות שיצרת ואת כל
          המוצרים שבהן.
        </Text>

        {!showDeleteForm ? (
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowDeleteForm(true)}
            testID="delete_account_button"
            accessibilityLabel="delete_account_button"
          >
            <Text style={styles.deleteAccountButtonText}>מחק את החשבון שלי</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.input}
              placeholder="הזן את הסיסמה שלך לאישור"
              placeholderTextColor="#888"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              testID="delete_account_password"
              accessibilityLabel="delete_account_password"
            />
            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>מחק לצמיתות</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeDeleteForm}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
