import { apiFetch } from './http';

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
      throw new Error('Network response was not ok');
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
      throw new Error('Network response was not ok');
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
      throw new Error('Network response was not ok');
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
