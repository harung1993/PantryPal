import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';
import { resetApiInstance } from '../services/api';

export default function LandingScreen({ navigation }) {
  const [serverConfigured, setServerConfigured] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    checkServerConfig();
  }, []);

  const checkServerConfig = async () => {
    const stored = await AsyncStorage.getItem('API_BASE_URL');
    if (stored) {
      setServerUrl(stored);
      setServerConfigured(true);
    }
  };

  const handleConfigureServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }

    await AsyncStorage.setItem('API_BASE_URL', cleanUrl);
    resetApiInstance(); // Reset API client to pick up new URL
    setServerConfigured(true);
    Alert.alert('Success', '✅ Server configured!\n\nYou can now sign in or sign up.');
  };

  if (!serverConfigured) {
    // Server configuration view
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.icon}>🥫</Text>
          <Text style={styles.title}>PantryPal</Text>
          <Text style={styles.subtitle}>Part of PalStack</Text>
        </View>

        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Connect to PantryPal</Text>
          <Text style={styles.configSubtitle}>
            Enter your PantryPal server URL
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.100"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.hint}>
              Examples:{'\n'}
              • http://192.168.68.119{'\n'}
              • http://macmini.local{'\n'}
              • https://pantrypal.example.com
            </Text>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleConfigureServer}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.helperBox}>
            <Text style={styles.helperText}>
              💡 This is the URL where your PantryPal backend is running.
              If you're at home, you can also access directly without this step.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Main landing view (after server is configured)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.icon}>🥫</Text>
        <Text style={styles.title}>PantryPal</Text>
        <Text style={styles.subtitle}>Part of PalStack</Text>
      </View>

      {/* Tagline */}
      <Text style={styles.tagline}>Never let food go to waste again</Text>

      {/* Features */}
      <View style={styles.features}>
        <Feature icon="📷" text="Scan barcodes with your phone" />
        <Feature icon="🔔" text="Get notified about expiring items" />
        <Feature icon="🏠" text="Integrate with Home Assistant" />
        <Feature icon="📊" text="Track everything in one place" />
        <Feature icon="🔒" text="Your data stays on your server" />
      </View>

      {/* PalStack Mission */}
      <View style={styles.missionBox}>
        <Text style={styles.missionTitle}>PalStack Mission</Text>
        <Text style={styles.missionText}>
          "That's what pals do – they show up and help with the everyday stuff. 
          At PalStack, we build simple, open-source tools that make life easier. 
          Track what's in your pantry, manage home repairs, stay on top of your budget – 
          all without compromising your privacy or freedom.{'\n\n'}
          Self-host for complete control, modify them to fit your needs, or use our 
          affordable hosted option. Either way, your pal's got your back."
        </Text>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      {/* Change Server Link */}
      <TouchableOpacity
        onPress={async () => {
          await AsyncStorage.removeItem('API_BASE_URL');
          resetApiInstance(); // Reset API instance
          setServerConfigured(false);
          setServerUrl('');
        }}
        style={{ alignItems: 'center', marginBottom: spacing.md }}
      >
        <Text style={styles.changeServerText}>Change server →</Text>
      </TouchableOpacity>

      {/* Helper Text */}
      <View style={styles.helperBox}>
        <Text style={styles.helperText}>
          💡 <Text style={styles.helperBold}>At home?</Text> You can access PantryPal 
          directly without logging in! This login is only needed for external access.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>🥫 PantryPal • Self-hosted pantry management</Text>
      </View>
    </ScrollView>
  );
}

function Feature({ icon, text }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    padding: spacing.xl,
    paddingTop: 60,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textPrimary,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  features: {
    marginBottom: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  missionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  missionText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    opacity: 0.95,
  },
  authButtons: {
    marginBottom: spacing.lg,
  },
  signInButton: {
    backgroundColor: colors.accent,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.large,
  },
  signInButtonText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  signUpButton: {
    backgroundColor: 'transparent',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  signUpButtonText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  helperBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  helperText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  helperBold: {
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: colors.textPrimary,
    opacity: 0.7,
  },
  configCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.large,
  },
  configTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  configSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
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
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
    marginBottom: spacing.md,
  },
  continueButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  changeServerText: {
    color: colors.textPrimary,
    fontSize: 14,
    opacity: 0.7,
  },
});