import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './SettingsScreen.styles';

const STORAGE_KEY = '@auto_reset_settings';

const SettingsScreen = ({ navigation }) => {
  const [autoReset, setAutoReset] = useState(false);
  const [resetTime, setResetTime] = useState('00:00');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEY);
      if (settings) {
        const parsed = JSON.parse(settings);
        setAutoReset(parsed.enabled);
        setResetTime(parsed.time || '00:00');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (enabled, time) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          enabled,
          time,
        }),
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleAutoResetToggle = value => {
    setAutoReset(value);
    saveSettings(value, resetTime);
  };

  const showTimePicker = () => {
    Alert.prompt(
      'הגדר זמן איפוס',
      'הזן זמן בפורמט HH:MM (למשל: 08:00)',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'אישור',
          onPress: time => {
            if (time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
              setResetTime(time);
              saveSettings(autoReset, time);
            } else {
              Alert.alert('שגיאה', 'פורמט זמן לא תקין');
            }
          },
        },
      ],
      'plain-text',
      resetTime,
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← חזור</Text>
        </TouchableOpacity>
        <Text style={styles.title}>הגדרות</Text>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>איפוס רשימה אוטומטי</Text>
          <Text style={styles.settingDescription}>
            מחק את כל המוצרים שנקנו בזמן קבוע
          </Text>
        </View>
        <Switch value={autoReset} onValueChange={handleAutoResetToggle} />
      </View>

      {autoReset && (
        <TouchableOpacity style={styles.settingItem} onPress={showTimePicker}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>זמן איפוס</Text>
            <Text style={styles.settingDescription}>
              שעת האיפוס היומי: {resetTime}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SettingsScreen;
