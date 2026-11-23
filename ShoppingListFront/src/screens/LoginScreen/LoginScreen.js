import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { styles } from './LoginScreen.styles';
import { colors } from '../../theme/colors';
import { login, register, requestPasswordReset } from '../../services/auth';
import { MIN_PASSWORD_LENGTH } from '../../services/validation';

const LoginScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // אם הבקשה לוקחת יותר מ-5 שניות - כנראה השרת "מתעורר", ומסבירים את זה למשתמש
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    if (!loading) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // שכחתי סיסמה
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail('');
  };

  const handleSendReset = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('שגיאה', 'אנא הזן את כתובת האימייל של החשבון');
      return;
    }
    setSendingReset(true);
    try {
      const message = await requestPasswordReset(forgotEmail);
      closeForgot();
      Alert.alert('בדוק את תיבת המייל', message);
    } catch (error) {
      Alert.alert('שגיאה', error.message);
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async () => {
    // ולידציה בסיסית
    if (!username.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    if (!isLogin && !email.trim()) {
      Alert.alert('שגיאה', 'אנא הזן כתובת אימייל');
      return;
    }

    // בהרשמה בלבד - משתמשים קיימים עם סיסמה קצרה יותר ממשיכים להתחבר כרגיל
    if (!isLogin && password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'שגיאה',
        `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`,
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // התחברות
        const response = await login(username, password);
        onLoginSuccess(response);
      } else {
        // הרשמה
        await register(username, email, password);
        // לאחר הרשמה מוצלחת, מתחברים אוטומטית
        const response = await login(username, password);
        onLoginSuccess(response);
      }
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'שגיאה בתהליך ההתחברות/הרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            testID="login_logo"
          />
          <Text style={styles.logoText}>ShopLi</Text>
          <Text style={styles.subtitle}>רשימת הקניות המשפחתית</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>{isLogin ? 'התחברות' : 'הרשמה'}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>שם משתמש</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן שם משתמש"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              testID="username_input" // <-- נוסף מזהה
              accessibilityLabel="username_input"
            />
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>אימייל</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן כתובת אימייל"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                testID="email_input" // <-- נוסף מזהה
                accessibilityLabel="email_input"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>סיסמא</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן סיסמא"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              testID="password_input" // <-- נוסף מזהה
              accessibilityLabel="password_input"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
            testID="login_button" // <-- נוסף מזהה
            accessibilityLabel="login_button"
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'התחבר' : 'הירשם'}
              </Text>
            )}
          </TouchableOpacity>

          {isSlow && (
            <Text style={styles.slowServerNote} testID="slow_server_note">
              השרת מתעורר, זה יכול לקחת עד דקה…
            </Text>
          )}

          {isLogin && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => setShowForgot(true)}
              testID="forgot_password_link"
              accessibilityLabel="forgot_password_link"
            >
              <Text style={styles.forgotButtonText}>שכחתי סיסמה</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
            testID="switch_mode_button" // <-- נוסף מזהה
          >
            <Text style={styles.switchButtonText}>
              {isLogin
                ? 'אין לך חשבון? הירשם כאן'
                : 'כבר יש לך חשבון? התחבר כאן'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <Text style={styles.securityText}>🔒 הסיסמא שלך מוצפנת ומאובטחת</Text>
        </View>
      </ScrollView>

      {/* שכחתי סיסמה - שליחת קישור איפוס למייל */}
      <Modal
        visible={showForgot}
        transparent
        animationType="slide"
        onRequestClose={closeForgot}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>איפוס סיסמה</Text>
            <Text style={styles.modalText}>
              הזן את האימייל של החשבון, ונשלח אליו קישור לבחירת סיסמה חדשה.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="כתובת אימייל"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              autoFocus
              testID="forgot_email_input"
              accessibilityLabel="forgot_email_input"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeForgot}
                disabled={sendingReset}
              >
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSendButton]}
                onPress={handleSendReset}
                disabled={sendingReset}
                testID="forgot_send_button"
                accessibilityLabel="forgot_send_button"
              >
                {sendingReset ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalSendText}>שלח קישור</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
