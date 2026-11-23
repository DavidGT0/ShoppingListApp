import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiFetch,
  publicFetch,
  readErrorMessage,
  beginTokenSwap,
  endTokenSwap,
} from './http';
import { clearAllCaches } from './offlineCache';

/**
 * הרשמה של משתמש חדש
 */
export const register = async (username, email, password) => {
  try {
    // הסרת רווחים מסביב - המקלדת בטלפון מוסיפה רווח אחרי מילה
    const response = await publicFetch('/register', {
      method: 'POST',
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim(),
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, 'ההרשמה נכשלה. נסה שוב בעוד רגע.'),
      );
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
    const cleanUsername = username.trim();

    // FastAPI OAuth2 מצפה לפורמט form-data
    const formData = new URLSearchParams();
    formData.append('username', cleanUsername);
    formData.append('password', password);

    const response = await publicFetch('/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, 'ההתחברות נכשלה. נסה שוב בעוד רגע.'),
      );
    }

    const data = await response.json();

    // מטמון של משתמש קודם לא ישרוד להתחברות חדשה
    await clearAllCaches();

    // שמירת ה-token ב-AsyncStorage
    await AsyncStorage.setItem('access_token', data.access_token);
    // השם הקנוני מהשרת (בהתחברות עם אימייל, cleanUsername הוא האימייל)
    await AsyncStorage.setItem('username', data.username || cleanUsername);

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * שינוי שם משתמש. השרת מחזיר טוקן חדש (הישן מפסיק לעבוד מיד),
 * ולכן הטוקן והשם נשמרים לפני שההבטחה מסתיימת. מחזיר את השם החדש.
 */
export const changeUsername = async newName => {
  const clean = (newName || '').trim();
  if (!clean) {
    throw new Error('נא להזין שם משתמש');
  }
  if (clean.includes('@')) {
    throw new Error('שם המשתמש לא יכול להכיל @');
  }
  beginTokenSwap();
  try {
    const response = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ username: clean }),
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, 'שינוי שם המשתמש נכשל. נסה שוב בעוד רגע.'),
      );
    }

    const data = await response.json();
    const username = data.username || clean;
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('username', username);
    return username;
  } catch (error) {
    console.error('Change username error:', error);
    throw error;
  } finally {
    endTokenSwap();
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
  } finally {
    await clearAllCaches();
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
      throw new Error(
        await readErrorMessage(response, 'שינוי הסיסמה נכשל. נסה שוב בעוד רגע.'),
      );
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
  const response = await publicFetch('/password-reset/request', {
    method: 'POST',
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
      throw new Error(
        await readErrorMessage(response, 'מחיקת החשבון נכשלה'),
      );
    }

    await logout();
    return true;
  } catch (error) {
    console.error('Delete account error:', error);
    throw error;
  }
};