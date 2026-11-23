import { apiFetch, readErrorMessage } from './http';
import { normalizeCategories } from './categories';

/**
 * קבלת כל הרשימות של המשתמש
 */
export const getShoppingLists = async () => {
  try {
    const response = await apiFetch(`/lists`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw error;
  }
};

/**
 * יצירת רשימה חדשה
 */
export const createShoppingList = async name => {
  try {
    const response = await apiFetch(`/lists`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating list:', error);
    throw error;
  }
};

/**
 * עדכון רשימה (למשל שינוי שם)
 */
export const updateShoppingList = async (listId, updates) => {
  try {
    const response = await apiFetch(`/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating list:', error);
    throw error;
  }
};

/**
 * מחיקת רשימה
 */
export const deleteShoppingList = async listId => {
  try {
    const response = await apiFetch(`/lists/${listId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return true;
  } catch (error) {
    console.error('Error deleting list:', error);
    throw error;
  }
};

/**
 * שיתוף רשימה עם משתמש אחר
 */
export const shareList = async (listId, username) => {
  try {
    const response = await apiFetch(`/lists/share`, {
      method: 'POST',
      body: JSON.stringify({ list_id: listId, username }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error sharing list:', error);
    throw error;
  }
};

/**
 * קבלת פריטים ברשימה
 */
export const getShoppingList = async listId => {
  try {
    const response = await apiFetch(`/items?list_id=${listId}`);

    if (!response.ok) {
      const error = new Error('Network response was not ok');
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

/**
 * הוספת פריט
 */
export const addItem = async (name, listId, amount = 1) => {
  try {
    const response = await apiFetch(`/items`, {
      method: 'POST',
      body: JSON.stringify({ name, list_id: listId, amount }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
};

/**
 * עדכון פריט
 */
export const updateItem = async (id, updates) => {
  try {
    const response = await apiFetch(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = new Error('Network response was not ok');
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

/**
 * מחיקת פריט
 */
export const deleteItem = async id => {
  try {
    const response = await apiFetch(`/items/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = new Error('Network response was not ok');
      error.status = response.status;
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Error deleting list:', error);
    throw error;
  }
};

/**
 * עדכון סדר הפריטים
 */
export const reorderItems = async reorderedItems => {
  try {
    const response = await apiFetch(`/items/reorder`, {
      method: 'POST',
      body: JSON.stringify(reorderedItems),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error reordering items:', error);
    throw error;
  }
};

/**
 * זורק שגיאה עם הודעת השרת (בעברית) וקוד התשובה
 */
const throwResponseError = async (response, fallback) => {
  const error = new Error(await readErrorMessage(response, fallback));
  error.status = response.status;
  throw error;
};

/**
 * קבלת קוד ההזמנה של הרשימה (נוצר אם עדיין אין)
 */
export const getInviteCode = async listId => {
  const response = await apiFetch(`/lists/${listId}/invite`, {
    method: 'POST',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להביא את קוד ההזמנה');
  }
  return (await response.json()).code;
};

/**
 * יצירת קוד הזמנה חדש (הקוד הקודם מפסיק לעבוד)
 */
export const resetInviteCode = async listId => {
  const response = await apiFetch(`/lists/${listId}/invite/reset`, {
    method: 'POST',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו ליצור קוד הזמנה חדש');
  }
  return (await response.json()).code;
};

/**
 * הצטרפות לרשימה באמצעות קוד הזמנה
 */
export const joinListByCode = async code => {
  const response = await apiFetch(`/lists/join`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להצטרף לרשימה');
  }
  return await response.json();
};

/**
 * רשימת חברי הרשימה
 */
export const getListMembers = async listId => {
  const response = await apiFetch(`/lists/${listId}/members`);
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להביא את חברי הרשימה');
  }
  return await response.json();
};

/**
 * הסרת חבר מהרשימה (לבעל הרשימה בלבד)
 */
export const removeListMember = async (listId, userId) => {
  const response = await apiFetch(`/lists/${listId}/members/${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להסיר את החבר');
  }
};

/**
 * עזיבת רשימה משותפת
 */
export const leaveList = async listId => {
  const response = await apiFetch(`/lists/${listId}/leave`, {
    method: 'POST',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו לעזוב את הרשימה');
  }
};

/**
 * הצעות להשלמה לשם מוצר (עד 8, בלי מוצרים שכבר פתוחים ברשימה)
 */
export const getSuggestions = async (q, listId) => {
  const response = await apiFetch(
    `/items/suggestions?q=${encodeURIComponent(q)}&list_id=${listId}`,
  );
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להביא הצעות');
  }
  return await response.json();
};

/**
 * החזרת כל המוצרים שנקנו אל הרשימה. מחזיר את מספר המוצרים שהוחזרו
 */
export const restorePurchased = async listId => {
  const response = await apiFetch(`/lists/${listId}/purchased/restore`, {
    method: 'POST',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להחזיר את המוצרים לרשימה');
  }
  return (await response.json()).restored;
};

/**
 * מחיקת כל המוצרים שנקנו. מחזיר את מספר המוצרים שנמחקו
 */
export const clearPurchased = async listId => {
  const response = await apiFetch(`/lists/${listId}/purchased/clear`, {
    method: 'POST',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו למחוק את המוצרים שנקנו');
  }
  return (await response.json()).deleted;
};

/**
 * שכפול רשימה - נוצרת רשימה חדשה בבעלותי עם אותם מוצרים
 */
export const duplicateList = async listId => {
  const response = await apiFetch(`/lists/${listId}/duplicate`, {
    method: 'POST',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו לשכפל את הרשימה');
  }
  return await response.json();
};

/**
 * מחלקות הרשימה: {custom, layout}. custom - המחלקות המותאמות, layout - שמות, סמלים וסדר.
 * תשובה בצורה הישנה (מערך) נקראת כ-{custom: מערך, layout: []}
 */
export const getListCategories = async listId => {
  const response = await apiFetch(`/lists/${listId}/categories`);
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו להביא את המחלקות');
  }
  return normalizeCategories(await response.json());
};

/**
 * שמירת הפריסה של המחלקות ברשימה: [{key, name?, icon?}], סדר המערך הוא הסדר
 */
export const saveCategoryLayout = async (listId, layout) => {
  const response = await apiFetch(`/lists/${listId}/categories/layout`, {
    method: 'PUT',
    body: JSON.stringify({ layout }),
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו לשמור את המחלקות');
  }
};

/**
 * יצירת מחלקה מותאמת ברשימה, עם סמל לא חובה. מחזיר {id, name, color, icon}
 */
export const createListCategory = async (listId, name, icon) => {
  const response = await apiFetch(`/lists/${listId}/categories`, {
    method: 'POST',
    body: JSON.stringify(icon ? { name, icon } : { name }),
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו ליצור את המחלקה');
  }
  return await response.json();
};

/**
 * מחיקת מחלקה מותאמת. מוצרים שבה חוזרים לסיווג אוטומטי
 */
export const deleteListCategory = async (listId, catId) => {
  const response = await apiFetch(`/lists/${listId}/categories/${catId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await throwResponseError(response, 'לא הצלחנו למחוק את המחלקה');
  }
};
