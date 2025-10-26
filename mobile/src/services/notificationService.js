// Create this new file: mobile/src/services/notificationService.js

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItems } from './api';

// Configure how notifications should be displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from iOS/Android
 */
export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiry-alerts', {
      name: 'Expiry Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFAAA5',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }
  } else {
    // Running in simulator
    console.log('Must use physical device for Push Notifications');
  }

  return true;
}

/**
 * Calculate expiring items and return counts
 */
export async function checkExpiringItems() {
  try {
    const items = await getItems();
    const itemsWithExpiry = items.filter(item => item.expiry_date);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let expired = 0;
    let critical = 0;
    let warning = 0;
    
    const criticalThreshold = parseInt(await AsyncStorage.getItem('CRITICAL_THRESHOLD')) || 3;
    const warningThreshold = parseInt(await AsyncStorage.getItem('WARNING_THRESHOLD')) || 7;
    
    itemsWithExpiry.forEach(item => {
      const expiryDate = new Date(item.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        expired++;
      } else if (daysUntil <= criticalThreshold) {
        critical++;
      } else if (daysUntil <= warningThreshold) {
        warning++;
      }
    });
    
    return { expired, critical, warning, total: expired + critical + warning };
  } catch (error) {
    console.error('Error checking expiring items:', error);
    return { expired: 0, critical: 0, warning: 0, total: 0 };
  }
}

/**
 * Send immediate notification about expiring items
 */
export async function sendExpiryNotification() {
  try {
    const counts = await checkExpiringItems();
    
    if (counts.total === 0) {
      console.log('No expiring items, skipping notification');
      return;
    }
    
    let title = '⚠️ Pantry Alert';
    let body = '';
    
    if (counts.expired > 0) {
      title = '🚨 Items Expired!';
      body = `${counts.expired} item${counts.expired > 1 ? 's' : ''} expired`;
      if (counts.critical > 0) {
        body += `, ${counts.critical} expiring soon`;
      }
    } else if (counts.critical > 0) {
      title = '⚠️ Items Expiring Soon';
      body = `${counts.critical} item${counts.critical > 1 ? 's' : ''} expiring in 3 days or less`;
      if (counts.warning > 0) {
        body += `, ${counts.warning} within a week`;
      }
    } else {
      title = '📅 Pantry Reminder';
      body = `${counts.warning} item${counts.warning > 1 ? 's' : ''} expiring within a week`;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'expiry_alert', counts },
        sound: true,
        priority: counts.expired > 0 || counts.critical > 0 ? 'high' : 'default',
      },
      trigger: null, // Send immediately
    });
    
    console.log('Notification sent:', title, body);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Schedule daily notification at specified time
 */
export async function scheduleDailyNotification(hour = 9, minute = 0) {
  try {
    // Cancel all existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule daily notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🥫 PantryPal Check',
        body: 'Checking for expiring items...',
        data: { type: 'daily_check' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
    
    console.log(`Daily notification scheduled for ${hour}:${minute}`);
    
    // Immediately check and notify if there are expiring items
    await sendExpiryNotification();
    
    return true;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
    return true;
  } catch (error) {
    console.error('Error cancelling notifications:', error);
    throw error;
  }
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Check notification permissions status
 */
export async function checkNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export default {
  registerForPushNotifications,
  checkExpiringItems,
  sendExpiryNotification,
  scheduleDailyNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  checkNotificationPermissions,
};