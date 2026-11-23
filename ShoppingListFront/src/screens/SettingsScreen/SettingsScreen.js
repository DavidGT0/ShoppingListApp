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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './SettingsScreen.styles';
import {
  logout,
  getCurrentUser,
  changePassword,
  changeUsername,
  deleteAccount,
} from '../../services/auth';
import { MIN_PASSWORD_LENGTH } from '../../services/validation';

const SettingsScreen = ({ onLogout }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);

  // States עבור שינוי שם משתמש
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

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
      if (error.staleToken) return; // הטוקן הוחלף באמצע - לא שגיאה אמיתית
      console.error('Failed to load user:', error);
    }
  };

  // שינוי שם משתמש: הטוקן החדש נשמר בשירות, בלי התנתקות ובלי ניווט
  const handleSaveUsername = async () => {
    const clean = newUsername.trim();
    if (!clean) {
      Alert.alert('שגיאה', 'נא להזין שם משתמש');
      return;
    }
    if (clean.includes('@')) {
      Alert.alert('שגיאה', 'שם המשתמש לא יכול להכיל @');
      return;
    }
    setIsSavingUsername(true);
    try {
      const updatedName = await changeUsername(clean);
      setUser(prev => ({ ...prev, username: updatedName }));
      setEditingUsername(false);
      setNewUsername('');
    } catch (error) {
      if (error.sessionExpired) return; // ההתראה כבר הוצגה וחזרנו למסך הכניסה
      Alert.alert('שגיאה', error.message || 'שינוי שם המשתמש נכשל');
    } finally {
      setIsSavingUsername(false);
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
      <View
        style={[styles.header, { paddingTop: insets.top + 24 }]}
        testID="settings_header"
      >
        <Text style={styles.title}>הגדרות</Text>
      </View>

      {user && (
        <View style={styles.userSection}>
          <Text style={styles.sectionTitle}>פרטי משתמש</Text>
          <View style={styles.userInfo}>
            <Text style={styles.label}>שם משתמש:</Text>
            <Text style={styles.value}>{user.username}</Text>
            {!editingUsername && (
              <TouchableOpacity
                testID="edit_username_button"
                style={styles.editButton}
                onPress={() => {
                  setNewUsername(user.username);
                  setEditingUsername(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="עריכת שם המשתמש"
              >
                <Text style={styles.editButtonText}>ערוך</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingUsername && (
            <View style={styles.passwordForm}>
              <TextInput
                testID="username_input_settings"
                style={styles.input}
                placeholder="שם משתמש חדש"
                placeholderTextColor="#888"
                autoCapitalize="none"
                autoCorrect={false}
                value={newUsername}
                onChangeText={setNewUsername}
                accessibilityLabel="שם משתמש חדש"
              />
              <View style={styles.formButtonsRow}>
                <TouchableOpacity
                  testID="save_username_button"
                  style={styles.saveButton}
                  onPress={handleSaveUsername}
                  disabled={isSavingUsername}
                  accessibilityRole="button"
                  accessibilityLabel="שמירת שם המשתמש"
                >
                  {isSavingUsername ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>שמור</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  testID="cancel_username_button"
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditingUsername(false);
                    setNewUsername('');
                  }}
                  disabled={isSavingUsername}
                  accessibilityRole="button"
                  accessibilityLabel="ביטול שינוי שם המשתמש"
                >
                  <Text style={styles.cancelButtonText}>ביטול</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            accessibilityRole="button"
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
                accessibilityRole="button"
                accessibilityLabel="שמירת הסיסמה"
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
                accessibilityRole="button"
                accessibilityLabel="ביטול שינוי הסיסמה"
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        accessibilityRole="button"
      >
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
            accessibilityLabel="מחיקת החשבון שלי"
            accessibilityRole="button"
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
              accessibilityLabel="סיסמה לאישור מחיקת החשבון"
            />
            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="מחיקת החשבון לצמיתות"
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
                accessibilityRole="button"
                accessibilityLabel="ביטול מחיקת החשבון"
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
