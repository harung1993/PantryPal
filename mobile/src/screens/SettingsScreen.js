import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/colors';
import api from '../services/api';

export default function SettingsScreen({ navigation, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('connection');
  
  // Connection settings
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [useApiKey, setUseApiKey] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({
    email: '',
    full_name: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Admin state
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = currentUser?.is_admin;

  useEffect(() => {
    loadConnectionSettings();
    if (currentUser) {
      loadProfile();
      if (isAdmin) {
        loadUsers();
        loadStats();
      }
    }
  }, [currentUser, isAdmin]);

  const loadConnectionSettings = async () => {
    const url = await AsyncStorage.getItem('API_BASE_URL');
    const key = await AsyncStorage.getItem('API_KEY');
    setServerUrl(url || '');
    setApiKey(key || '');
    setUseApiKey(!!key);
  };

  const saveConnectionSettings = async () => {
    try {
      if (!serverUrl.trim()) {
        Alert.alert('Error', 'Please enter a server URL');
        return;
      }
      await AsyncStorage.setItem('API_BASE_URL', serverUrl);
      if (useApiKey && apiKey) {
        await AsyncStorage.setItem('API_KEY', apiKey);
      } else {
        await AsyncStorage.removeItem('API_KEY');
      }
      Alert.alert('Success', 'Connection settings saved. Please restart the app for changes to take effect.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const loadProfile = async () => {
    try {
      const data = await api.get('/users/me');
      setProfile({
        email: data.email || '',
        full_name: data.full_name || ''
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileLoading(true);

    try {
      await api.patch('/users/me', profile);
      Alert.alert('Success', '✅ Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.post('/users/me/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      Alert.alert('Success', '✅ Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const loadUsers = async () => {
    setAdminLoading(true);
    try {
      const data = await api.get('/admin/users');
      console.log('Loaded users:', data);
      setUsers(data.users || []); // Ensure we always have an array
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]); // Set empty array on error
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setAdminLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.get('/admin/stats');
      console.log('Loaded stats:', data);
      setStats(data || null);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats(null);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/admin/users/${userId}`, {
        is_active: !currentStatus
      });
      loadUsers();
      loadStats();
      Alert.alert('Success', `User ${currentStatus ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${username}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${userId}`);
              loadUsers();
              loadStats();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  // Debug logging
  useEffect(() => {
    console.log('SettingsScreen - currentUser:', currentUser);
    console.log('SettingsScreen - isAdmin:', isAdmin);
  }, [currentUser, isAdmin]);

  const tabs = [
    { id: 'connection', label: '🌐 Connection', show: true },
    { id: 'profile', label: '👤 Profile', show: !!currentUser },
    { id: 'admin', label: '👥 Admin', show: isAdmin },
    { id: 'about', label: 'ℹ️ About', show: true },
  ].filter(tab => tab.show);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* User Info */}
      {currentUser && (
        <View style={styles.userInfo}>
          <View>
            <Text style={styles.username}>{currentUser.username}</Text>
            {currentUser.email && (
              <Text style={styles.userEmail}>{currentUser.email}</Text>
            )}
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        <View style={styles.tabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* CONNECTION TAB */}
        {activeTab === 'connection' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Server Configuration</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Server URL</Text>
                <TextInput
                  style={styles.input}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://192.168.1.100"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>
                  Example: http://192.168.68.119 or http://macmini.local
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Use API Key</Text>
                  <Switch
                    value={useApiKey}
                    onValueChange={setUseApiKey}
                    trackColor={{ false: '#ccc', true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
                
                {useApiKey && (
                  <>
                    <TextInput
                      style={[styles.input, { fontFamily: 'monospace', fontSize: 12 }]}
                      value={apiKey}
                      onChangeText={setApiKey}
                      placeholder="pp_xxxxxxxxxxxxxxxx"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                    <Text style={styles.hint}>
                      Required for api_key_only or full auth mode
                    </Text>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={saveConnectionSettings}
              >
                <Text style={styles.buttonText}>💾 Save Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && currentUser && (
          <View>
            {/* Profile Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username (read-only)</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={currentUser.username}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>📧 Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={profile.email}
                  onChangeText={(text) => setProfile({ ...profile, email: text })}
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={profile.full_name}
                  onChangeText={(text) => setProfile({ ...profile, full_name: text })}
                  placeholder="John Doe"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleUpdateProfile}
                disabled={profileLoading}
              >
                {profileLoading ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Change Password */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔒 Change Password</Text>
                <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                  <Text style={styles.showPasswordText}>
                    {showPasswords ? '🙈 Hide' : '👁️ Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.current_password}
                  onChangeText={(text) => setPasswordData({ ...passwordData, current_password: text })}
                  placeholder="Enter current password"
                  secureTextEntry={!showPasswords}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.new_password}
                  onChangeText={(text) => setPasswordData({ ...passwordData, new_password: text })}
                  placeholder="Enter new password"
                  secureTextEntry={!showPasswords}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>Minimum 8 characters</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirm_password}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirm_password: text })}
                  placeholder="Confirm new password"
                  secureTextEntry={!showPasswords}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.button, styles.logoutButton]}
                onPress={onLogout}
              >
                <Text style={styles.buttonText}>🚪 Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && isAdmin && (
          <View>
            {/* Statistics */}
            {stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total_users}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.active_users}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.inactive_users}</Text>
                  <Text style={styles.statLabel}>Inactive</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{stats.admin_users}</Text>
                  <Text style={styles.statLabel}>Admins</Text>
                </View>
              </View>
            )}

            {/* User Management */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 User Management</Text>
              
              {adminLoading ? (
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
                    Loading users...
                  </Text>
                </View>
              ) : users.length === 0 ? (
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <Text style={{ fontSize: 48, marginBottom: spacing.md }}>👥</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>
                    No users found
                  </Text>
                </View>
              ) : (
                <View>
                  {users.map((user) => (
                    <View key={user.id} style={styles.userCard}>
                      <View style={styles.userCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userCardName}>{user.username}</Text>
                          <Text style={styles.userCardEmail}>{user.email || 'No email'}</Text>
                          {user.full_name && (
                            <Text style={styles.userCardDetail}>{user.full_name}</Text>
                          )}
                        </View>
                        <View style={styles.badges}>
                          {user.is_admin && (
                            <View style={styles.adminBadgeSmall}>
                              <Text style={styles.adminBadgeTextSmall}>Admin</Text>
                            </View>
                          )}
                          <View style={[
                            styles.statusBadge,
                            user.is_active ? styles.statusActive : styles.statusInactive
                          ]}>
                            <Text style={[
                              styles.statusBadgeText,
                              { color: user.is_active ? '#065f46' : '#991b1b' }
                            ]}>
                              {user.is_active ? 'Active' : 'Disabled'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {user.id !== currentUser?.id && (
                        <View style={styles.userCardActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.actionButtonPrimary]}
                            onPress={() => handleToggleUserStatus(user.id, user.is_active)}
                          >
                            <Text style={styles.actionButtonText}>
                              {user.is_active ? 'Disable' : 'Enable'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.actionButtonDanger]}
                            onPress={() => handleDeleteUser(user.id, user.username)}
                          >
                            <Text style={styles.actionButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About PantryPal</Text>
            
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>2.0.0</Text>
            </View>
            
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Server</Text>
              <Text style={[styles.aboutValue, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                {serverUrl || 'Not configured'}
              </Text>
            </View>
            
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Platform</Text>
              <Text style={styles.aboutValue}>Mobile App</Text>
            </View>

            <View style={styles.aboutFooter}>
              <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🥫</Text>
              <Text style={styles.aboutTitle}>PantryPal</Text>
              <Text style={styles.aboutSubtitle}>Part of PalStack</Text>
              <Text style={styles.aboutDescription}>
                Self-hosted pantry management for modern homes
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userInfo: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  adminBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 50,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.card,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  showPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    padding: spacing.lg,
    margin: '1%',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userCardEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  userCardDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  adminBadgeSmall: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  adminBadgeTextSmall: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonDanger: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  aboutFooter: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  aboutSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  aboutDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});