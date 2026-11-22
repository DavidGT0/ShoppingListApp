import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, apiFetch } from './http';

/**
 * הרשמה של משתמש חדש
 */
export const register = async (username, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      // בודקים אם התשובה היא JSON לפני שמפעילים parse
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      } else {
        const textError = await response.text();
        console.error('Server raw response:', textError);
        throw new Error('Server error occurred. Please check backend logs.');
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * התחברות - מקבל token ושומר אותו
 */
export const login = async (username, password) => {
  try {
    // FastAPI OAuth2 מצפה לפורמט form-data
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();

    // שמירת ה-token ב-AsyncStorage
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('username', username);

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * התנתקות - מחיקת ה-token
 */
export const logout = async () => {
  try {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('username');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

/**
 * קבלת ה-token השמור
 */
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
};

/**
 * בדיקה אם המשתמש מחובר
 */
export const isAuthenticated = async () => {
  const token = await getToken();
  return token !== null;
};

/**
 * קבלת פרטי המשתמש המחובר
 */
export const getCurrentUser = async () => {
  try {
    const response = await apiFetch('/users/me');

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

/**
 * שינוי סיסמת משתמש
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await apiFetch('/users/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to change password');
    }

    return await response.json();
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

/**
 * בקשת קישור לאיפוס סיסמה במייל. מחזיר את הודעת השרת (זהה תמיד, גם למייל שלא רשום).
 */
export const requestPasswordReset = async email => {
  const response = await fetch(`${API_BASE_URL}/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!response.ok) {
    throw new Error('לא הצלחנו לשלוח את הבקשה. נסה שוב בעוד רגע.');
  }
  const data = await response.json();
  return data.message;
};

/**
 * מחיקת החשבון לצמיתות (דורש אישור סיסמה). לאחר הצלחה - מנקה את ההתחברות מהמכשיר.
 */
export const deleteAccount = async password => {
  try {
    const response = await apiFetch('/users/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        typeof errorData.detail === 'string'
          ? errorData.detail
          : 'מחיקת החשבון נכשלה',
      );
    }

    await logout();
    return true;
  } catch (error) {
    console.error('Delete account error:', error);
    throw error;
  }
};