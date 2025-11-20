import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './src/styles/colors';
import { getApiBaseUrl } from './config';
import api from './src/services/api'; // ADD THIS IMPORT

// Main app screens
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import ManualAddScreen from './src/screens/ManualAddScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Auth screens
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const baseURL = await getApiBaseUrl();
      
      // First, check what auth mode the server is in
      let status;
      try {
        const statusResponse = await fetch(`${baseURL}/api/auth/status`, { timeout: 5000 });
        status = await statusResponse.json();
        console.log('Auth status:', status);
      } catch (error) {
        console.error('Cannot reach server:', error);
        // Server unreachable - show landing page so user can configure connection
        setNeedsAuth(false);
        setIsAuthenticated(true);
        setCheckingAuth(false);
        return;
      }
      
      // If auth mode is 'none', no authentication needed
      if (status.auth_mode === 'none') {
        setNeedsAuth(false);
        setIsAuthenticated(true);
        setCheckingAuth(false);
        return;
      }
      
      // Check if we have a session token
      const sessionToken = await AsyncStorage.getItem('SESSION_TOKEN');
      
      if (sessionToken) {
        // Try to validate the session
        try {
          const meResponse = await fetch(`${baseURL}/api/auth/me`, {
            headers: { 
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (meResponse.ok) {
            const userData = await meResponse.json();
            console.log('Logged in as:', userData);
            
            // Only set currentUser if it's an actual session, not trusted network
            if (userData.type !== 'trusted_network') {
              setCurrentUser(userData);
            }
            
            setIsAuthenticated(true);
            setNeedsAuth(false);
          } else {
            // Session invalid, show landing
            console.log('Session invalid, clearing token');
            await AsyncStorage.removeItem('SESSION_TOKEN');
            setNeedsAuth(true);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.log('Error checking session:', error);
          await AsyncStorage.removeItem('SESSION_TOKEN');
          setNeedsAuth(true);
          setIsAuthenticated(false);
        }
      } else {
        // No session token
        // For 'smart' mode on trusted network, allow access without login
        if (status.auth_mode === 'smart') {
          // Check if we're on trusted network
          try {
            const meResponse = await fetch(`${baseURL}/api/auth/me`);
            if (meResponse.ok) {
              const userData = await meResponse.json();
              if (userData.type === 'trusted_network') {
                // Trusted network - allow access without setting currentUser
                setNeedsAuth(false);
                setIsAuthenticated(true);
              } else {
                setNeedsAuth(true);
                setIsAuthenticated(false);
              }
            } else {
              setNeedsAuth(true);
              setIsAuthenticated(false);
            }
          } catch {
            setNeedsAuth(true);
            setIsAuthenticated(false);
          }
        } else if (status.auth_mode === 'full') {
          setNeedsAuth(true);
          setIsAuthenticated(false);
        } else if (status.auth_mode === 'api_key_only') {
          // Check if we have an API key
          const apiKey = await AsyncStorage.getItem('API_KEY');
          if (apiKey) {
            setNeedsAuth(false);
            setIsAuthenticated(true);
          } else {
            setNeedsAuth(true);
            setIsAuthenticated(false);
          }
        } else {
          // Unknown mode, allow access
          setNeedsAuth(false);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // On error, show landing page (safe default)
      setNeedsAuth(true);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLoginSuccess = async (user) => {
    console.log('Login success, user:', user);
    
    // CRITICAL: Reset API instance so it picks up the new session token
    api.resetApiInstance();
    
    setCurrentUser(user);
    setIsAuthenticated(true);
    setNeedsAuth(false);
  };

  const handleLogout = async () => {
    try {
      const baseURL = await getApiBaseUrl();
      const sessionToken = await AsyncStorage.getItem('SESSION_TOKEN');
      
      if (sessionToken) {
        await fetch(`${baseURL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    await AsyncStorage.removeItem('SESSION_TOKEN');
    
    // Reset API instance on logout too
    api.resetApiInstance();
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    setNeedsAuth(true);
  };

  // Loading screen
  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>🥫</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, fontSize: 18, color: colors.textSecondary }}>
          Loading PantryPal...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated && needsAuth ? (
        // Auth Stack - Show when authentication is required
        <Stack.Navigator
          initialRouteName="Landing"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
          <Stack.Screen name="Signup">
            {props => <SignupScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      ) : (
        // Main App Stack - Show when authenticated or auth not required
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="AddItem" component={AddItemScreen} />
          <Stack.Screen name="ManualAdd" component={ManualAddScreen} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
          <Stack.Screen name="Settings">
            {props => (
              <SettingsScreen 
                {...props} 
                onLogout={handleLogout} 
                currentUser={currentUser} 
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}