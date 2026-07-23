import React, { useState } from 'react';
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
} from 'react-native';
import { styles } from './LoginScreen.styles';
import { colors } from '../../theme/colors';
import { login, register } from '../../services/auth';

const LoginScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          <Text style={styles.logoEmoji}>🛒</Text>
          <Text style={styles.logoText}>רשימת הקניות שלי</Text>
          <Text style={styles.subtitle}>נהל את הקניות בצורה חכמה</Text>
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
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'התחבר' : 'הירשם'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
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
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
