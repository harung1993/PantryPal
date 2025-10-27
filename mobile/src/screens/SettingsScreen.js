import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';
import { getItems, addItemManual } from '../services/api';
import { getDefaultLocations, getDefaultCategories, saveDefaultLocations, saveDefaultCategories } from '../utils/defaults';
import { 
  registerForPushNotifications, 
  scheduleDailyNotification, 
  cancelAllNotifications,
  sendExpiryNotification,
  checkNotificationPermissions
} from '../services/notificationService';

const DEFAULT_API_URL = 'http://192.168.68.119';

export default function SettingsScreen({ navigation }) {
  const [currentView, setCurrentView] = useState('menu');
  const [apiUrl, setApiUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [testing, setTesting] = useState(false);
  
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  
  const [exportFilter, setExportFilter] = useState('all');
  const [exportValue, setExportValue] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [criticalThreshold, setCriticalThreshold] = useState(3);
  const [warningThreshold, setWarningThreshold] = useState(7);
  const [haEnabled, setHaEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('API_BASE_URL');
      const url = savedUrl || DEFAULT_API_URL;
      setApiUrl(url);
      setOriginalUrl(url);

      const locs = await getDefaultLocations();
      const cats = await getDefaultCategories();
      
      setLocations(locs);
      setCategories(cats);
      
      const notifEnabled = await AsyncStorage.getItem('NOTIFICATIONS_ENABLED');
      const notifTime = await AsyncStorage.getItem('NOTIFICATION_TIME');
      const criticalDays = await AsyncStorage.getItem('CRITICAL_THRESHOLD');
      const warningDays = await AsyncStorage.getItem('WARNING_THRESHOLD');
      const ha = await AsyncStorage.getItem('HA_ENABLED');
      
      setNotificationsEnabled(notifEnabled === 'true');
      setNotificationTime(notifTime || '09:00');
      setCriticalThreshold(parseInt(criticalDays) || 3);
      setWarningThreshold(parseInt(warningDays) || 7);
      setHaEnabled(ha === 'true');
      
      const hasPermission = await checkNotificationPermissions();
      if (notifEnabled === 'true' && !hasPermission) {
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const testUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const response = await fetch(`${testUrl}/health`, { timeout: 5000 });
      const data = await response.json();
      
      if (data.status === 'healthy') {
        Alert.alert('Success!', 'Connected to PantryPal backend ✅');
      } else {
        Alert.alert('Warning', 'Backend responded but status is not healthy');
      }
    } catch (error) {
      Alert.alert('Connection Failed', 'Cannot reach backend. Check the URL and try again.');
    } finally {
      setTesting(false);
    }
  };

  const saveConnectionSettings = async () => {
    try {
      const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
      
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        Alert.alert('Invalid URL', 'URL must start with http:// or https://');
        return;
      }

      await AsyncStorage.setItem('API_BASE_URL', cleanUrl);
      setOriginalUrl(cleanUrl);
      Alert.alert('Success', 'Connection settings saved! ✅');
    } catch (error) {
      Alert.alert('Error', 'Failed to save connection settings');
    }
  };

  const resetToDefault = () => {
    Alert.alert(
      'Reset to Default',
      'Reset API URL to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: () => setApiUrl(DEFAULT_API_URL) }
      ]
    );
  };

  const addLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
      setShowLocationInput(false);
    }
  };

  const removeLocation = (location) => {
    setLocations(locations.filter(l => l !== location));
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
      setShowCategoryInput(false);
    }
  };

  const removeCategory = (category) => {
    setCategories(categories.filter(c => c !== category));
  };

  const savePreferences = async () => {
    try {
      await saveDefaultLocations(locations);
      await saveDefaultCategories(categories);
      Alert.alert('Success', 'Preferences saved! ✅');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const exportToCSV = async () => {
    if (exportFilter !== 'all' && !exportValue) {
      Alert.alert('Please Select', 'Please select a location or category to filter by.');
      return;
    }

    setExporting(true);
    try {
      const items = await getItems();
      
      let filteredItems = items;
      if (exportFilter === 'location' && exportValue) {
        filteredItems = items.filter(item => item.location === exportValue);
      } else if (exportFilter === 'category' && exportValue) {
        filteredItems = items.filter(item => item.category === exportValue);
      }

      if (filteredItems.length === 0) {
        Alert.alert('No Items', 'No items to export with the selected filter.');
        return;
      }

      const headers = ['ID', 'Name', 'Brand', 'Category', 'Location', 'Quantity', 'Expiry Date', 'Notes', 'Barcode', 'Added Date'];
      const rows = filteredItems.map(item => [
        item.id,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.brand || '').replace(/"/g, '""')}"`,
        `"${(item.category || 'Uncategorized').replace(/"/g, '""')}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`,
        item.quantity || 0,
        item.expiry_date || '',
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.barcode || '',
        item.added_at || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const filterSuffix = exportFilter === 'all' ? 'all' : 
                          exportFilter === 'location' ? `location-${exportValue}` :
                          `category-${exportValue}`;
      const filename = `pantrypal-export-${filterSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
      
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export PantryPal Inventory',
        });
        Alert.alert('Success', `✅ Exported ${filteredItems.length} items!`);
      } else {
        Alert.alert('Success', `Saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const importFromCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        Alert.alert('Invalid CSV', 'CSV file is empty or invalid');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const previewRows = lines.slice(1, 6).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        return values;
      });

      setImportPreview({
        headers,
        rows: previewRows,
        totalRows: lines.length - 1,
        fileContent,
      });
    } catch (error) {
      console.error('Failed to read CSV:', error);
      Alert.alert('Error', 'Failed to read CSV file');
    }
  };

  const performImport = async () => {
    if (!importPreview) return;

    Alert.alert(
      'Confirm Import',
      `Import ${importPreview.totalRows} items?\n\nDuplicates (same barcode) will be skipped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Import',
          onPress: async () => {
            setImporting(true);
            try {
              const lines = importPreview.fileContent.split('\n').filter(line => line.trim());
              const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
              
              let successCount = 0;
              let skipCount = 0;
              let errorCount = 0;

              const existingItems = await getItems();
              const existingBarcodes = new Set(existingItems.map(item => item.barcode).filter(Boolean));

              for (let i = 1; i < lines.length; i++) {
                try {
                  const values = [];
                  let current = '';
                  let inQuotes = false;
                  
                  for (let char of lines[i]) {
                    if (char === '"') {
                      inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                      values.push(current.trim().replace(/^"|"$/g, ''));
                      current = '';
                    } else {
                      current += char;
                    }
                  }
                  values.push(current.trim().replace(/^"|"$/g, ''));

                  const item = {};
                  headers.forEach((header, index) => {
                    item[header.toLowerCase().replace(/ /g, '_')] = values[index] || '';
                  });

                  if (item.barcode && existingBarcodes.has(item.barcode)) {
                    skipCount++;
                    continue;
                  }

                  const itemData = {
                    name: item.name || 'Unknown Item',
                    brand: item.brand || null,
                    category: item.category || 'Uncategorized',
                    location: item.location || 'Basement Pantry',
                    quantity: parseInt(item.quantity) || 1,
                    expiry_date: item.expiry_date || null,
                    notes: item.notes || '',
                    barcode: item.barcode || null,
                  };

                  await addItemManual(itemData);
                  successCount++;
                } catch (error) {
                  console.error('Failed to import row:', error);
                  errorCount++;
                }
              }

              Alert.alert(
                'Import Complete!',
                `✅ ${successCount} items imported\n${skipCount > 0 ? `⊘ ${skipCount} duplicates skipped\n` : ''}${errorCount > 0 ? `✗ ${errorCount} errors` : ''}`
              );
              
              setImportPreview(null);
            } catch (error) {
              console.error('Import failed:', error);
              Alert.alert('Import Failed', 'Failed to import CSV. Please try again.');
            } finally {
              setImporting(false);
            }
          }
        }
      ]
    );
  };

  const cancelImport = () => {
    setImportPreview(null);
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      try {
        await registerForPushNotifications();
        setNotificationsEnabled(true);
        await AsyncStorage.setItem('NOTIFICATIONS_ENABLED', 'true');
        Alert.alert('Success', '✅ Notifications enabled!\n\nYou will receive daily alerts about expiring items.');
      } catch (error) {
        Alert.alert('Permission Denied', 'Please enable notifications in your device Settings → PantryPal → Notifications');
      }
    } else {
      await cancelAllNotifications();
      setNotificationsEnabled(false);
      await AsyncStorage.setItem('NOTIFICATIONS_ENABLED', 'false');
      Alert.alert('Disabled', 'Notifications have been turned off.');
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem('NOTIFICATION_TIME', notificationTime);
      await AsyncStorage.setItem('CRITICAL_THRESHOLD', String(criticalThreshold));
      await AsyncStorage.setItem('WARNING_THRESHOLD', String(warningThreshold));
      
      if (notificationsEnabled) {
        const [hour, minute] = notificationTime.split(':').map(Number);
        await scheduleDailyNotification(hour, minute);
        Alert.alert('Success', `✅ Notifications scheduled for ${notificationTime} daily!`);
      } else {
        Alert.alert('Success', 'Settings saved!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const menuItems = [
    { id: 'connection', icon: '🌐', title: 'Connection', description: 'Configure server URL', color: colors.scanButton },
    { id: 'importexport', icon: '📥', title: 'Import/Export', description: 'Manage CSV files', color: colors.accent },
    { id: 'notifications', icon: '🔔', title: 'Notifications', description: 'Expiry alerts', color: '#FFB74D' },
    { id: 'homeassistant', icon: '🏠', title: 'Home Assistant', description: 'Smart home integration', color: '#4FC3F7' },
    { id: 'preferences', icon: '⚙️', title: 'Preferences', description: 'Locations & categories', color: colors.secondary },
    { id: 'about', icon: 'ℹ️', title: 'About', description: 'App information', color: colors.primary },
  ];

  const renderMenuCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
      onPress={() => setCurrentView(item.id)}
    >
      <View style={styles.menuCardContent}>
        <Text style={styles.menuCardIcon}>{item.icon}</Text>
        <View style={styles.menuCardText}>
          <Text style={styles.menuCardTitle}>{item.title}</Text>
          <Text style={styles.menuCardDescription}>{item.description}</Text>
        </View>
        <Text style={styles.menuCardArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  if (currentView === 'menu') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>⚙️ Settings</Text>
          </View>
          <View style={styles.menuContainer}>
            {menuItems.map(renderMenuCard)}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('menu')}>
            <Text style={styles.backText}>← Settings</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {currentView === 'connection' && '🌐 Connection'}
            {currentView === 'importexport' && '📥 Import/Export'}
            {currentView === 'notifications' && '🔔 Notifications'}
            {currentView === 'homeassistant' && '🏠 Home Assistant'}
            {currentView === 'preferences' && '⚙️ Preferences'}
            {currentView === 'about' && 'ℹ️ About'}
          </Text>
        </View>

        {currentView === 'connection' && (
          <View style={styles.card}>
            <Text style={styles.description}>
              Configure the backend API URL. The server must be running and accessible.
            </Text>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.1.100:8000"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.hint}>
              Examples:{'\n'}• http://192.168.68.119:8000{'\n'}• http://macmini.local:8000
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testConnection} disabled={testing}>
                <Text style={styles.buttonText}>{testing ? 'Testing...' : '🔍 Test'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={resetToDefault}>
                <Text style={styles.buttonText}>↺ Reset</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveConnectionSettings}>
              <Text style={styles.saveButtonText}>💾 Save Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentView === 'notifications' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔔 Mobile Notifications</Text>
            <Text style={styles.description}>
              Get notified when items are expiring soon. Notifications check daily at your chosen time.
            </Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <TouchableOpacity
                style={[styles.toggle, notificationsEnabled && styles.toggleActive]}
                onPress={handleNotificationToggle}
              >
                <View style={[styles.toggleCircle, notificationsEnabled && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>
            {notificationsEnabled && (
              <>
                <Text style={styles.label}>Daily Check Time</Text>
                <TextInput
                  style={styles.input}
                  value={notificationTime}
                  onChangeText={setNotificationTime}
                  placeholder="09:00"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.hint}>Format: HH:MM (24-hour). Example: 09:00 for 9 AM, 14:30 for 2:30 PM</Text>
                
                <Text style={styles.label}>Critical Threshold (days)</Text>
                <TextInput
                  style={styles.input}
                  value={String(criticalThreshold)}
                  onChangeText={(val) => setCriticalThreshold(parseInt(val) || 3)}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.hint}>🚨 Red alert when items expire within this many days</Text>
                
                <Text style={styles.label}>Warning Threshold (days)</Text>
                <TextInput
                  style={styles.input}
                  value={String(warningThreshold)}
                  onChangeText={(val) => setWarningThreshold(parseInt(val) || 7)}
                  keyboardType="number-pad"
                  placeholder="7"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.hint}>⚠️ Warning when items expire within this many days</Text>
              </>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={saveNotificationSettings}>
              <Text style={styles.saveButtonText}>💾 Save Notifications</Text>
            </TouchableOpacity>
            
            {notificationsEnabled && (
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={async () => {
                  await sendExpiryNotification();
                  Alert.alert('Test Sent', '✅ Check your notifications!\n\nIf you don\'t see it, check that you have items expiring soon.');
                }}
              >
                <Text style={styles.buttonText}>🧪 Send Test Notification Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {currentView === 'homeassistant' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>🏠 Home Assistant</Text>
              <Text style={styles.description}>
                Connect PantryPal to your Home Assistant for automations, sensors, and whole-home notifications.
              </Text>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable HA Integration</Text>
                <TouchableOpacity
                  style={[styles.toggle, haEnabled && styles.toggleActive]}
                  onPress={async () => {
                    setHaEnabled(!haEnabled);
                    await AsyncStorage.setItem('HA_ENABLED', (!haEnabled).toString());
                  }}
                >
                  <View style={[styles.toggleCircle, haEnabled && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={() => Alert.alert('Success', 'Home Assistant settings saved! ✅')}>
                <Text style={styles.saveButtonText}>💾 Save HA Settings</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>📋 Setup Instructions</Text>
              <Text style={styles.description}>
                Add this sensor to your Home Assistant configuration.yaml:
              </Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
{`sensor:
  - platform: rest
    name: Pantry Expiring Items
    resource: ${originalUrl}/api/stats/expiring?days=7
    value_template: "{{ value_json.summary.total_expiring }}"
    json_attributes:
      - summary
      - items
    scan_interval: 3600`}
                </Text>
              </View>
              <Text style={styles.description}>
                This creates a sensor showing how many items are expiring soon. Restart Home Assistant after adding.
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert('Example Automation', 
`automation:
  - alias: "Pantry Expiry Alert"
    trigger:
      - platform: time
        at: "09:00:00"
    condition:
      - condition: numeric_state
        entity_id: sensor.pantry_expiring_items
        above: 0
    action:
      - service: notify.mobile_app
        data:
          title: "⚠️ Pantry Alert"
          message: "{{ states('sensor.pantry_expiring_items') }} items expiring soon!"`, 
                  [{ text: 'Got it!' }]);
                }}
              >
                <Text style={styles.buttonText}>📖 View Example Automation</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentView === 'importexport' && (
          <View>
            {!importPreview ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>📤 Import from CSV</Text>
                <Text style={styles.description}>Import items in bulk. Duplicates will be skipped.</Text>
                <TouchableOpacity style={styles.importButton} onPress={importFromCSV} disabled={importing}>
                  <Text style={styles.importButtonText}>📁 Choose CSV File</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Preview ({importPreview.totalRows} items)</Text>
                <ScrollView horizontal style={styles.previewTable}>
                  <View>
                    <View style={styles.previewHeaderRow}>
                      {importPreview.headers.slice(0, 5).map((h, i) => (
                        <Text key={i} style={styles.previewHeader}>{h}</Text>
                      ))}
                    </View>
                    {importPreview.rows.map((row, i) => (
                      <View key={i} style={styles.previewRow}>
                        {row.slice(0, 5).map((cell, j) => (
                          <Text key={j} style={styles.previewCell}>{cell}</Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={performImport} disabled={importing}>
                    <Text style={styles.buttonText}>{importing ? '⏳ Importing...' : '📤 Import'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancelImport} disabled={importing}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>📥 Export to CSV</Text>
              <Text style={styles.description}>Export your pantry inventory.</Text>
              <Text style={styles.label}>Export Filter</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity style={[styles.filterButton, exportFilter === 'all' && styles.filterButtonActive]} onPress={() => { setExportFilter('all'); setExportValue(''); }}>
                  <Text style={[styles.filterButtonText, exportFilter === 'all' && styles.filterButtonTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, exportFilter === 'location' && styles.filterButtonActive]} onPress={() => { setExportFilter('location'); setExportValue(''); }}>
                  <Text style={[styles.filterButtonText, exportFilter === 'location' && styles.filterButtonTextActive]}>Location</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, exportFilter === 'category' && styles.filterButtonActive]} onPress={() => { setExportFilter('category'); setExportValue(''); }}>
                  <Text style={[styles.filterButtonText, exportFilter === 'category' && styles.filterButtonTextActive]}>Category</Text>
                </TouchableOpacity>
              </View>
              {exportFilter === 'location' && (
                <View style={styles.filterValueContainer}>
                  <Text style={styles.label}>Select Location</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {locations.map(loc => (
                      <TouchableOpacity key={loc} style={[styles.chip, exportValue === loc && styles.chipActive]} onPress={() => setExportValue(loc)}>
                        <Text style={[styles.chipText, exportValue === loc && styles.chipTextActive]}>{loc}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {exportFilter === 'category' && (
                <View style={styles.filterValueContainer}>
                  <Text style={styles.label}>Select Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {categories.map(cat => (
                      <TouchableOpacity key={cat} style={[styles.chip, exportValue === cat && styles.chipActive]} onPress={() => setExportValue(cat)}>
                        <Text style={[styles.chipText, exportValue === cat && styles.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <TouchableOpacity style={[styles.exportButton, (exportFilter !== 'all' && !exportValue) && styles.exportButtonDisabled]} onPress={exportToCSV} disabled={exporting || (exportFilter !== 'all' && !exportValue)}>
                <Text style={styles.exportButtonText}>{exporting ? '⏳ Exporting...' : '📥 Export'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentView === 'preferences' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>📍 Default Locations</Text>
              <Text style={styles.description}>Manage your storage locations.</Text>
              {locations.map((location, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{location}</Text>
                  <TouchableOpacity onPress={() => removeLocation(location)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {showLocationInput ? (
                <View style={styles.addItemContainer}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={newLocation} onChangeText={setNewLocation} placeholder="New location" placeholderTextColor={colors.textSecondary} autoFocus />
                  <TouchableOpacity onPress={addLocation} style={styles.addItemButton}>
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowLocationInput(false)}>
                    <Text style={styles.cancelButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addButton} onPress={() => setShowLocationInput(true)}>
                  <Text style={styles.addButtonText}>+ Add Location</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>🏷️ Default Categories</Text>
              <Text style={styles.description}>Manage product categories.</Text>
              {categories.map((category, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{category}</Text>
                  <TouchableOpacity onPress={() => removeCategory(category)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {showCategoryInput ? (
                <View style={styles.addItemContainer}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={newCategory} onChangeText={setNewCategory} placeholder="New category" placeholderTextColor={colors.textSecondary} autoFocus />
                  <TouchableOpacity onPress={addCategory} style={styles.addItemButton}>
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowCategoryInput(false)}>
                    <Text style={styles.cancelButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addButton} onPress={() => setShowCategoryInput(true)}>
                  <Text style={styles.addButtonText}>+ Add Category</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
              <Text style={styles.saveButtonText}>💾 Save Preferences</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentView === 'about' && (
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.2.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Current Server</Text>
              <Text style={styles.infoValue}>{originalUrl}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'} Mobile</Text>
            </View>
            <View style={styles.footer}>
              <Text style={{ fontSize: 32 }}>🥫</Text>
              <Text style={styles.footerText}>PantryPal</Text>
              <Text style={styles.footerSubtext}>Self-hosted pantry management</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  header: { padding: spacing.lg, paddingTop: 60, marginBottom: spacing.md },
  backText: { fontSize: 18, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary },
  menuContainer: { padding: spacing.lg, paddingTop: 0 },
  menuCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.medium },
  menuCardContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  menuCardIcon: { fontSize: 32, marginRight: spacing.md },
  menuCardText: { flex: 1 },
  menuCardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.xs },
  menuCardDescription: { fontSize: 14, color: colors.textSecondary },
  menuCardArrow: { fontSize: 32, color: colors.textSecondary, fontWeight: '300' },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: borderRadius.lg, marginHorizontal: spacing.lg, marginBottom: spacing.lg, ...shadows.small },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  description: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 22 },
  label: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, fontSize: 16, color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  button: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', ...shadows.small },
  testButton: { backgroundColor: colors.scanButton },
  resetButton: { backgroundColor: colors.textSecondary },
  primaryButton: { backgroundColor: colors.primary },
  cancelButton: { backgroundColor: colors.textSecondary },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  saveButton: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.lg, ...shadows.medium },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  importButton: { backgroundColor: colors.secondary, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
  importButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  previewTable: { marginVertical: spacing.md },
  previewHeaderRow: { flexDirection: 'row', backgroundColor: colors.background, borderBottomWidth: 2, borderBottomColor: colors.border },
  previewHeader: { width: 100, padding: spacing.sm, fontWeight: 'bold', fontSize: 12, color: colors.textPrimary },
  previewRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  previewCell: { width: 100, padding: spacing.sm, fontSize: 12, color: colors.textPrimary },
  pickerContainer: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  filterButton: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.background, alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  filterButtonTextActive: { color: colors.textPrimary },
  filterValueContainer: { marginBottom: spacing.md },
  chipScroll: { marginTop: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.background, marginRight: spacing.sm, borderWidth: 2, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary },
  exportButton: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.md, ...shadows.medium },
  exportButtonDisabled: { backgroundColor: colors.border, opacity: 0.5 },
  exportButtonText: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.sm, marginBottom: spacing.xs },
  listItemText: { fontSize: 16, color: colors.textPrimary },
  removeButton: { fontSize: 20, color: colors.error, fontWeight: 'bold', padding: spacing.xs },
  addItemContainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  addItemButton: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.sm },
  addItemButtonText: { color: colors.textPrimary, fontWeight: '600' },
  cancelButtonText: { fontSize: 24, color: colors.textSecondary, padding: spacing.sm },
  addButton: { backgroundColor: colors.secondary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm, ...shadows.small },
  addButtonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 15, color: colors.textSecondary },
  infoValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  footer: { alignItems: 'center', marginTop: spacing.xl, paddingTop: spacing.xl },
  footerText: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  footerSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.card, ...shadows.small },
  toggleCircleActive: { alignSelf: 'flex-end' },
  codeBlock: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, borderLeftWidth: 4, borderLeftColor: colors.primary, marginVertical: spacing.md },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
  secondaryButton: { backgroundColor: colors.secondary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md, ...shadows.small },
});