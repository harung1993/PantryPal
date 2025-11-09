import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './src/styles/colors';
import { getApiBaseUrl } from './config';

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
      
      // Check auth status
      const statusResponse = await fetch(`${baseURL}/api/auth/status`);
      const status = await statusResponse.json();
      
      // If in smart mode, check if we're authenticated
      if (status.auth_mode === 'smart' || status.auth_mode === 'full') {
        // Try to get current user
        const sessionToken = await AsyncStorage.getItem('SESSION_TOKEN');
        
        if (sessionToken) {
          try {
            const meResponse = await fetch(`${baseURL}/api/auth/me`, {
              headers: { 'Cookie': `session_token=${sessionToken}` }
            });
            
            if (meResponse.ok) {
              const userData = await meResponse.json();
              setCurrentUser(userData);
              
              // If trusted network, no auth needed
              if (userData.type === 'trusted_network') {
                setNeedsAuth(false);
                setIsAuthenticated(true);
              } else {
                setNeedsAuth(false);
                setIsAuthenticated(true);
              }
            } else {
              // Session invalid, check if we can access without auth
              await checkOpenAccess(baseURL);
            }
          } catch (error) {
            await checkOpenAccess(baseURL);
          }
        } else {
          await checkOpenAccess(baseURL);
        }
      } else {
        // none or api_key_only mode
        setNeedsAuth(false);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Assume open access on error
      setNeedsAuth(false);
      setIsAuthenticated(true);
    } finally {
      setCheckingAuth(false);
    }
  };

  const checkOpenAccess = async (baseURL) => {
    try {
      // Try to access API without auth
      const testResponse = await fetch(`${baseURL}/api/items`);
      
      if (testResponse.ok) {
        // Open access or trusted network
        setNeedsAuth(false);
        setIsAuthenticated(true);
      } else if (testResponse.status === 401) {
        // Auth required
        setNeedsAuth(true);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Assume open access on network error
      setNeedsAuth(false);
      setIsAuthenticated(true);
    }
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setNeedsAuth(false);
  };

  const handleLogout = async () => {
    try {
      const baseURL = await getApiBaseUrl();
      await fetch(`${baseURL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    await AsyncStorage.removeItem('SESSION_TOKEN');
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
            {props => <SettingsScreen {...props} onLogout={handleLogout} currentUser={currentUser} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}