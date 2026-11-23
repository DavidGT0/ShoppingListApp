// משך מינימלי לפעולה: הספינר של המשיכה לריענון נשאר גלוי לפחות זמן זה,
// גם כשהשרת עונה תוך 200ms - אחרת המשתמש לא רואה שהיה ריענון
export const MIN_REFRESH_MS = 700;

let minRefreshMs = MIN_REFRESH_MS;

// לבדיקות: קובע את המשך המינימלי (0 = בלי המתנה)
export const setMinRefreshMs = ms => {
  minRefreshMs = ms;
};

// מחכה למשימה ואז ליתרת הזמן עד ms. שגיאה של המשימה נזרקת שוב אחרי ההמתנה
// (ה-finally לא מחזיר ערך, ולכן לא בולע אותה)
export const withMinDuration = async (task, ms = minRefreshMs) => {
  const started = Date.now();
  try {
    return await task();
  } finally {
    const rest = ms - (Date.now() - started);
    if (rest > 0) {
      await new Promise(resolve => setTimeout(resolve, rest));
    }
  }
};
