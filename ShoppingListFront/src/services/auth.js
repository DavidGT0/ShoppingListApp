import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://shoppinglistapp-7dj5.onrender.com';

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
    const token = await getToken();
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};
