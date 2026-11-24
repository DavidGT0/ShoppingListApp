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
import LinearGradient from 'react-native-linear-gradient';
import { makeStyles } from './LoginScreen.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { login, register, requestPasswordReset } from '../../services/auth';
import { MIN_PASSWORD_LENGTH } from '../../services/validation';

const LoginScreen = ({ onLoginSuccess }) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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
        <LinearGradient
          testID="login_header_gradient"
          colors={colors.headerGradient}
          useAngle
          angle={135}
          style={styles.logoContainer}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            testID="login_logo"
          />
          <Text style={styles.logoText}>ShopLi</Text>
          <Text style={styles.subtitle}>רשימת הקניות המשפחתית</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.title}>{isLogin ? 'התחברות' : 'הרשמה'}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {isLogin ? 'שם משתמש או אימייל' : 'שם משתמש'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isLogin ? 'שם משתמש או אימייל' : 'הזן שם משתמש'}
              placeholderTextColor={colors.placeholder}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              testID="username_input" // <-- נוסף מזהה
              accessibilityLabel={isLogin ? 'שם משתמש או אימייל' : 'שם משתמש'}
            />
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>אימייל</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן כתובת אימייל"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                testID="email_input" // <-- נוסף מזהה
                accessibilityLabel="כתובת אימייל"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>סיסמא</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן סיסמא"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              testID="password_input" // <-- נוסף מזהה
              accessibilityLabel="סיסמה"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
            testID="login_button" // <-- נוסף מזהה
            accessibilityLabel={isLogin ? 'כפתור התחברות' : 'כפתור הרשמה'}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
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
              accessibilityLabel="שכחתי סיסמה"
              accessibilityRole="button"
            >
              <Text style={styles.forgotButtonText}>שכחתי סיסמה</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
            testID="switch_mode_button" // <-- נוסף מזהה
            accessibilityRole="button"
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
            <View style={styles.sheetHandle} testID="sheet_handle" />
            <Text style={styles.modalTitle}>איפוס סיסמה</Text>
            <Text style={styles.modalText}>
              הזן את האימייל של החשבון, ונשלח אליו קישור לבחירת סיסמה חדשה.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="כתובת אימייל"
              placeholderTextColor={colors.placeholder}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              autoFocus
              testID="forgot_email_input"
              accessibilityLabel="כתובת אימייל לאיפוס סיסמה"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeForgot}
                disabled={sendingReset}
                accessibilityRole="button"
                accessibilityLabel="ביטול"
              >
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSendButton]}
                onPress={handleSendReset}
                disabled={sendingReset}
                testID="forgot_send_button"
                accessibilityLabel="שליחת קישור לאיפוס סיסמה"
                accessibilityRole="button"
                accessibilityState={{ disabled: sendingReset, busy: sendingReset }}
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
