import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://shoppinglistapp-7dj5.onrender.com';

// מה לעשות כשההתחברות פגה (נרשם מתוך App.js - חזרה למסך הכניסה)
let onSessionExpired = null;
// הטוקן האחרון שכבר דיווחנו עליו שפג - כדי שכמה בקשות במקביל לא יקפיצו כמה התראות
let lastExpiredToken = null;

export const setSessionExpiredHandler = handler => {
  onSessionExpired = handler;
};

/**
 * שגיאה שנזרקת כשהשרת דחה את הטוקן (401).
 * מסכים יכולים לבדוק error.sessionExpired כדי לא להציג הודעת שגיאה נוספת.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.sessionExpired = true;
  }
}

/**
 * קריאה לשרת עם הטוקן השמור.
 * אם השרת מחזיר 401 - מוחקים את הטוקן, מודיעים ל-App וזורקים SessionExpiredError.
 * (לא לשימוש בהתחברות עצמה - שם 401 פירושו סיסמה שגויה)
 */
export const apiFetch = async (path, options = {}) => {
  const token = await AsyncStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    await AsyncStorage.multiRemove(['access_token', 'username']);
    if (token && token !== lastExpiredToken) {
      lastExpiredToken = token;
      onSessionExpired?.();
    }
    throw new SessionExpiredError();
  }

  return response;
};
