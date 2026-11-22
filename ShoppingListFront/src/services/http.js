import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://shoppinglistapp-7dj5.onrender.com';

// השרת ב-Render "נרדם" כשאין שימוש, והתעוררות לוקחת עד כ-50 שניות - לכן מרווח נדיב
export const REQUEST_TIMEOUT_MS = 70000;

const TIMEOUT_MESSAGE = 'השרת לא מגיב כרגע. נסה שוב בעוד רגע.';
const NO_CONNECTION_MESSAGE =
  'אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב.';

/**
 * fetch עם הגבלת זמן, והודעות שגיאה בעברית לבעיות רשת (במקום הודעה טכנית)
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    const networkError = new Error(
      error?.name === 'AbortError' ? TIMEOUT_MESSAGE : NO_CONNECTION_MESSAGE,
    );
    networkError.network = true;
    throw networkError;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * קריאה לשרת בלי טוקן (הרשמה, התחברות, איפוס סיסמה)
 */
export const publicFetch = (path, options = {}) =>
  fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

// שמות השדות בעברית, להודעות על שדה לא תקין (שגיאת 422 של השרת)
const FIELD_ERRORS = {
  email: 'כתובת האימייל אינה תקינה',
  username: 'שם המשתמש אינו תקין',
  password: 'הסיסמה אינה תקינה',
};

/**
 * קריאת הודעת השגיאה מתשובה של השרת, כטקסט שאפשר להציג למשתמש.
 * מטפל גם בשגיאות שדה (רשימה ולא טקסט) ובתשובות שאינן JSON (למשל דף שגיאה של Render).
 */
export const readErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data?.detail)) {
      const fields = data.detail.flatMap(item => item?.loc ?? []);
      const known = Object.keys(FIELD_ERRORS).find(f => fields.includes(f));
      return known ? FIELD_ERRORS[known] : 'אחד הפרטים שהוזנו אינו תקין';
    }
  } catch (error) {
    // לא JSON - נשתמש בהודעת ברירת המחדל
  }
  return fallback;
};

/**
 * "להעיר" את השרת ברקע כשהאפליקציה נפתחת, כדי שיהיה מוכן עד שהמשתמש יתחבר.
 * לא זורק שגיאות אף פעם.
 */
export const wakeUpServer = async () => {
  try {
    await fetchWithTimeout(`${API_BASE_URL}/`);
  } catch (error) {
    // לא חשוב - זו רק בקשת "התעוררות"
  }
};

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

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    await AsyncStorage.removeMany(['access_token', 'username']); // AsyncStorage v3 (אין multiRemove)
    if (token && token !== lastExpiredToken) {
      lastExpiredToken = token;
      onSessionExpired?.();
    }
    throw new SessionExpiredError();
  }

  return response;
};
