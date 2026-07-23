import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// מסכים
import MyListsScreen from './src/screens/MyListsScreen/MyListsScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen/ShoppingListScreen';
import SettingsScreen from './src/screens/SettingsScreen/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen/LoginScreen';

import { isAuthenticated } from './src/services/auth';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ListsStack = createNativeStackNavigator();

// סטאק פנימי עבור הרשימות (מעבר ממסך "הרשימות שלי" אל מסך המוצרים)
function ListsStackNavigator() {
  return (
    <ListsStack.Navigator screenOptions={{ headerShown: false }}>
      <ListsStack.Screen name="MyLists" component={MyListsScreen} />
      <ListsStack.Screen
        name="ShoppingListItems"
        component={ShoppingListScreen}
      />
    </ListsStack.Navigator>
  );
}

// הטאבים הראשיים בתחתית המסך
function MainTabNavigator({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="ListsTab"
        component={ListsStackNavigator}
        options={{
          tabBarLabel: 'הדף הראשי',
          tabBarIcon: ({ color }) => (
            <View style={{ opacity: color === colors.primary ? 1 : 0.6 }}>
              <Text style={{ fontSize: 20 }}>📋</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: 'הגדרות',
          tabBarIcon: ({ color }) => (
            <View style={{ opacity: color === colors.primary ? 1 : 0.6 }}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </View>
          ),
        }}
      >
        {props => <SettingsScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    setIsLoggedIn(authenticated);
    setIsLoading(false);
  };

  // חשוב: GestureHandlerRootView חייב לעטוף את כל האפליקציה מהשורש,
  // כולל את מסך הטעינה - אחרת מחוות (swipe, drag) עלולות לא לעבוד
  // כראוי במסכים מסוימים, במיוחד לאחר ניווט.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          {!isLoggedIn ? (
            <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
          ) : (
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main">
                  {props => (
                    <MainTabNavigator
                      {...props}
                      onLogout={() => setIsLoggedIn(false)}
                    />
                  )}
                </Stack.Screen>
              </Stack.Navigator>
            </NavigationContainer>
          )}
        </SafeAreaProvider>
      )}
    </GestureHandlerRootView>
  );
}

export default App;
