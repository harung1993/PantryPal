import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/colors';
import api from '../services/api';

export default function SettingsScreen({ navigation, currentUser, onLogout }) {
  // Connection settings
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [useApiKey, setUseApiKey] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({ email: '', full_name: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '', new_password: '', confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Admin state
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // Invite user state
  const [inviteData, setInviteData] = useState({
    username: '', email: '', full_name: '', password: ''
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Check if user is on trusted network (not actually logged in)
  const isTrustedNetwork = !currentUser || currentUser?.type === 'trusted_network';
  const isActualUser = currentUser && !isTrustedNetwork; // Any logged in user (not just trusted network)
  const isAdmin = currentUser?.is_admin;

  useEffect(() => {
    loadConnectionSettings();
    
    // Only load profile for actual logged-in users
    if (isActualUser) {
      loadProfile();
      if (isAdmin) {
        loadUsers();
        loadStats();
      }
    }
  }, [currentUser, isActualUser, isAdmin]);

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
      Alert.alert('Success', 'Connection settings saved. Please restart the app.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const loadProfile = async () => {
    try {
      const data = await api.get('/api/users/me');
      setProfile({ email: data.email || '', full_name: data.full_name || '' });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      await api.patch('/api/users/me', profile);
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
      await api.post('/api/users/me/change-password', {
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
      const data = await api.get('/api/admin/users');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.get('/api/admin/stats');
      setStats(data || null);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteData.username || !inviteData.email || !inviteData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (inviteData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    
    setInviteLoading(true);
    try {
      await api.post('/api/auth/register', inviteData);
      Alert.alert('Success', `✅ User ${inviteData.username} created successfully!`);
      setInviteData({ username: '', email: '', full_name: '', password: '' });
      loadUsers();
      loadStats();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/api/admin/users/${userId}`, { is_active: !currentStatus });
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
      `Are you sure you want to delete "${username}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/users/${userId}`);
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

      {/* User Info Bar */}
      {currentUser && (
        <View style={styles.userInfo}>
          <View style={{ flex: 1 }}>
            {isTrustedNetwork ? (
              <>
                <Text style={styles.username}>🏠 Local Network Access</Text>
                <Text style={styles.userEmail}>Connected via trusted network</Text>
              </>
            ) : (
              <>
                <Text style={styles.username}>{currentUser.username}</Text>
                {currentUser.email && (
                  <Text style={styles.userEmail}>{currentUser.email}</Text>
                )}
              </>
            )}
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* CONNECTION SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 Connection</Text>
          <Text style={styles.sectionDescription}>Configure your PantryPal server connection</Text>
          
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
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Use API Key</Text>
            <Switch
              value={useApiKey}
              onValueChange={setUseApiKey}
              trackColor={{ false: '#d1d5db', true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {useApiKey && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your API key"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={saveConnectionSettings}>
            <Text style={styles.buttonText}>💾 Save Connection</Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE SECTION - Only for actual logged in users */}
        {isActualUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 My Profile</Text>
            <Text style={styles.sectionDescription}>Update your account information</Text>
            
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
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profile.full_name}
                onChangeText={(text) => setProfile({ ...profile, full_name: text })}
                placeholder="John Doe"
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
                <Text style={styles.buttonText}>💾 Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* PASSWORD SECTION - Only for actual logged in users */}
        {isActualUser && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>🔒 Change Password</Text>
              </View>
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
                <Text style={styles.buttonText}>🔑 Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* LOGIN PROMPT - For trusted network users */}
        {isTrustedNetwork && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔐 Account Access</Text>
            <Text style={styles.sectionDescription}>
              You're currently using local network access. To manage your profile and access admin features, you need to log in with an account.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={onLogout}
            >
              <Text style={styles.buttonText}>🔑 Login with Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ADMIN SECTION */}
        {isAdmin && (
          <>
            {/* Stats */}
            {stats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.total_users}</Text>
                    <Text style={styles.statLabel}>Total</Text>
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
              </View>
            )}

            {/* Invite User */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>➕ Invite User</Text>
              <Text style={styles.sectionDescription}>Create a new user account</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.username}
                  onChangeText={(text) => setInviteData({ ...inviteData, username: text })}
                  placeholder="username"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.email}
                  onChangeText={(text) => setInviteData({ ...inviteData, email: text })}
                  placeholder="user@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.full_name}
                  onChangeText={(text) => setInviteData({ ...inviteData, full_name: text })}
                  placeholder="John Doe"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.password}
                  onChangeText={(text) => setInviteData({ ...inviteData, password: text })}
                  placeholder="Min 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleInviteUser}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>✉️ Create User</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* User Management */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 User Management</Text>
              
              {adminLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : (
                users.map((user) => (
                  <View key={user.id} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userCardName}>
                          {user.username}
                          {user.is_admin && <Text style={{ color: colors.primary }}> (Admin)</Text>}
                        </Text>
                        <Text style={styles.userCardEmail}>{user.email}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: user.is_active ? '#10b981' : '#ef4444' }
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.userCardActions}>
                      <TouchableOpacity
                        style={[styles.userActionButton, { backgroundColor: user.is_active ? '#fef3c7' : '#d1fae5' }]}
                        onPress={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        <Text style={[styles.userActionButtonText, { color: user.is_active ? '#92400e' : '#065f46' }]}>
                          {user.is_active ? 'Disable' : 'Enable'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.userActionButton, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleDeleteUser(user.id, user.username)}
                      >
                        <Text style={[styles.userActionButtonText, { color: '#991b1b' }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* LOGOUT SECTION - Only for actual logged in users */}
        {isActualUser && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={onLogout}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ABOUT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About PantryPal</Text>
          <Text style={styles.aboutText}>Version 1.3.0</Text>
          <Text style={styles.aboutText}>
            Self-hosted pantry management for your home.{'\n'}
            Part of the PalStack ecosystem.
          </Text>
          <Text style={[styles.aboutText, { fontStyle: 'italic', marginTop: spacing.md }]}>
            "That's what pals do – they show up and help with the everyday stuff."
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginTop: 0,
  },
  showPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    margin: spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  userCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userCardEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  userCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  userActionButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  userActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    paddingVertical: spacing.xl,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});