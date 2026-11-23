import AsyncStorage from '@react-native-async-storage/async-storage';

// מטמון לצפייה במצב לא מקוון. הערכים הם ה-JSON של תשובות השרת.
const CACHE_PREFIX = '@cache_';

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
 */
export const loadWithCache = async (fetcher, key) => {
  try {
    const data = await fetcher();
    await saveCache(key, data);
    return { data, fromCache: false };
  } catch (error) {
    if (error?.network) {
      const cached = await readCache(key);
      if (cached !== null) {
        return { data: cached, fromCache: true };
      }
    }
    throw error;
  }
};
