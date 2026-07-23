import { getToken } from './auth';

const API_BASE_URL = 'https://shoppinglistapp-7dj5.onrender.com';

/**
 * פונקצית עזר לקבלת headers עם authorization
 */
const getHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * קבלת כל הרשימות של המשתמש
 */
export const getShoppingLists = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/lists`, { headers });

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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/lists`, {
      method: 'POST',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
      method: 'PUT',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
      method: 'DELETE',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/lists/share`, {
      method: 'POST',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/items?list_id=${listId}`, {
      headers,
    });

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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'DELETE',
      headers,
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
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/items/reorder`, {
      method: 'POST',
      headers,
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
