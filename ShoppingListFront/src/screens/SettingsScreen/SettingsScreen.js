import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { styles } from './SettingsScreen.styles';
import { logout, getCurrentUser, changePassword } from '../../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation, onLogout }) => {
  const [user, setUser] = useState(null);
  const [autoResetEnabled, setAutoResetEnabled] = useState(false);
  const [resetInterval, setResetInterval] = useState('daily');

  // States עבור שינוי סיסמה
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadUser();
    loadSettings();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedAutoReset = await AsyncStorage.getItem('@auto_reset_enabled');
      const savedInterval = await AsyncStorage.getItem('@reset_interval');
      if (savedAutoReset !== null)
        setAutoResetEnabled(JSON.parse(savedAutoReset));
      if (savedInterval !== null) setResetInterval(savedInterval);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleToggleAutoReset = async value => {
    setAutoResetEnabled(value);
    try {
      await AsyncStorage.setItem('@auto_reset_enabled', JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  };

  const handleSelectInterval = async interval => {
    setResetInterval(interval);
    try {
      await AsyncStorage.setItem('@reset_interval', interval);
      Alert.alert('הגדרות נשמרו', 'תזמון איפוס המוצרים עודכן בהצלחה.');
    } catch (error) {
      console.error('Failed to save interval:', error);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← חזור</Text>
        </TouchableOpacity>
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

      {/* הגדרת איפוס אוטומטי של מוצרים שנקנו */}
      <View style={styles.userSection}>
        <Text style={styles.sectionTitle}>ניהול רשימה אוטומטי</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.label}>החזרת מוצרים שנקנו אוטומטית</Text>
          <Switch
            value={autoResetEnabled}
            onValueChange={handleToggleAutoReset}
          />
        </View>

        {autoResetEnabled && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.label, { marginBottom: 8 }]}>
              תדירות איפוס:
            </Text>
            <View style={styles.intervalContainer}>
              <TouchableOpacity
                style={[
                  styles.intervalButton,
                  resetInterval === 'daily' && styles.intervalButtonActive,
                ]}
                onPress={() => handleSelectInterval('daily')}
              >
                <Text
                  style={[
                    styles.intervalText,
                    resetInterval === 'daily' && styles.intervalTextActive,
                  ]}
                >
                  יומי (כל 24 שעות)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.intervalButton,
                  resetInterval === 'weekly' && styles.intervalButtonActive,
                ]}
                onPress={() => handleSelectInterval('weekly')}
              >
                <Text
                  style={[
                    styles.intervalText,
                    resetInterval === 'weekly' && styles.intervalTextActive,
                  ]}
                >
                  שבועי
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>התנתק</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsScreen;
