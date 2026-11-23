import AsyncStorage from '@react-native-async-storage/async-storage';

// מטמון לצפייה במצב לא מקוון. הערכים הם ה-JSON של תשובות השרת.
const CACHE_PREFIX = '@cache_';

// עולה בכל ניקוי: תשובה שהתחילה לפני ניקוי (למשל משתמש קודם) לא נשמרת אחריו
let generation = 0;

// כמה זמן מחכים לטעינה הראשונית לפני שמציגים את המטמון (מצב לא מקוון)
export const INITIAL_LOAD_GRACE_MS = 10000;

export const cacheKeys = {
  lists: '@cache_lists',
  items: listId => `@cache_items_${listId}`,
  categories: listId => `@cache_categories_${listId}`,
};

export const saveCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // כשל בשמירת מטמון לא צריך לשבור את המסך
  }
};

/**
 * קריאת מטמון. מחזיר null אם אין ערך או שהוא פגום.
 */
export const readCache = async key => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

/**
 * מחיקת כל מפתחות המטמון (התנתקות, פקיעת התחברות, מחיקת חשבון)
 */
export const clearAllCaches = async () => {
  generation++;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeysToRemove = keys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeysToRemove.length > 0) {
      await AsyncStorage.removeMany(cacheKeysToRemove); // AsyncStorage v3 (אין multiRemove)
    }
  } catch (error) {
    console.error('Clear caches error:', error);
  }
};

/**
 * טעינה עם גיבוי מהמטמון. רק שגיאת רשת (error.network) מחזירה נתונים שמורים;
 * כל שגיאה אחרת נזרקת הלאה בלי לגעת במטמון.
 *
 * options (לטעינה ראשונית בלבד): graceMs + onEarlyCache. אם הבקשה לא הסתיימה אחרי graceMs
 * ויש מטמון - onEarlyCache(cached) נקרא והבקשה ממשיכה. אם אחר כך נכשלה ברשת מוחזר
 * alreadyShown: true (המטמון כבר מוצג). signal (AbortSignal) מבטל את הטיימר.
 */
export const loadWithCache = async (fetcher, key, options = {}) => {
  const { graceMs, onEarlyCache, signal } = options;
  const startGeneration = generation;
  let settled = false;
  let early = false;
  let timer = null;
  if (graceMs && onEarlyCache) {
    timer = setTimeout(async () => {
      timer = null;
      const cached = await readCache(key);
      if (settled || cached === null || signal?.aborted) return;
      if (startGeneration !== generation) return;
      early = true;
      onEarlyCache(cached);
    }, graceMs);
    signal?.addEventListener?.('abort', () => clearTimeout(timer));
  }
  try {
    const data = await fetcher();
    settled = true;
    clearTimeout(timer);
    if (startGeneration === generation) await saveCache(key, data);
    return { data, fromCache: false };
  } catch (error) {
    settled = true;
    clearTimeout(timer);
    if (error?.network) {
      if (early) return { data: null, fromCache: true, alreadyShown: true };
      const cached = await readCache(key);
      if (cached !== null) {
        return { data: cached, fromCache: true };
      }
    }
    throw error;
  }
};
