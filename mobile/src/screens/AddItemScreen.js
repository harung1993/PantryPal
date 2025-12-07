import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addItem } from '../services/api';
import { getDefaultLocations } from '../utils/defaults';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';

export default function AddItemScreen({ route, navigation }) {
  const { barcode, productInfo } = route.params;
  const [location, setLocation] = useState('Basement Pantry');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [locations, setLocations] = useState(['Basement Pantry']);

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    const locs = await getDefaultLocations();
    setLocations(locs);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const setQuickDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setExpiryDate(date);
    setShowDatePicker(false);
  };

  const handleAdd = async () => {
    if (quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }

    setLoading(true);
    try {
      const expiryStr = expiryDate ? expiryDate.toISOString().split('T')[0] : null;
      await addItem(barcode, location, quantity, expiryStr);
      Alert.alert('Success', 'Item added to pantry!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Item</Text>
        <View style={{ width: 60 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Product Info Card with Gradient Border */}
        <View style={styles.gradientBorderWrapper}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBorder}
          >
            <View style={styles.productCard}>
              {productInfo.image_url && (
                <Image
                  source={{ uri: productInfo.image_url }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.productName}>{productInfo.name}</Text>
              {productInfo.brand && (
                <Text style={styles.productBrand}>Brand: {productInfo.brand}</Text>
              )}
              {productInfo.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{productInfo.category}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Location Picker */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>📍 Location</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={location}
              onValueChange={(itemValue) => setLocation(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {locations.map((loc) => (
                <Picker.Item key={loc} label={loc} value={loc} color={colors.textPrimary} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Quantity */}
        <View style={styles.inputCard}>
          <Text style={styles.label}># Quantity</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>➖</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.quantityInput}
              value={String(quantity)}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setQuantity(Math.max(1, num));
              }}
              keyboardType="number-pad"
            />
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>➕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expiry Date */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>📅 Expiry Date (optional)</Text>
          
          {expiryDate && (
            <Text style={styles.selectedDate}>
              Selected: {expiryDate.toLocaleDateString()}
            </Text>
          )}

          <View style={styles.quickDateContainer}>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setQuickDate(7)}
            >
              <Text style={styles.quickDateText}>+7d</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setQuickDate(30)}
            >
              <Text style={styles.quickDateText}>+1m</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setQuickDate(180)}
            >
              <Text style={styles.quickDateText}>+6m</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setQuickDate(365)}
            >
              <Text style={styles.quickDateText}>+1y</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {expiryDate ? 'Change Date' : 'Select Date'}
            </Text>
          </TouchableOpacity>

          {expiryDate && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => setExpiryDate(null)}
            >
              <Text style={styles.clearDateText}>Clear Date</Text>
            </TouchableOpacity>
          )}

          {showDatePicker && (
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={expiryDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor={colors.textPrimary}
                themeVariant="light"
              />
            </View>
          )}
        </View>

        {/* Gradient Save Button */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.saveButtonGradient}
        >
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAdd}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Adding...' : '💾 Add to Pantry'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
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
    paddingTop: 50,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  gradientBorderWrapper: {
    marginBottom: spacing.lg,
  },
  gradientBorder: {
    borderRadius: borderRadius.lg,
    padding: 2,
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg - 2,
    padding: spacing.lg,
    alignItems: 'center',
  },
  productImage: {
    width: 150,
    height: 150,
    marginBottom: spacing.md,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  productBrand: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.lightBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  pickerContainer: {
    backgroundColor: colors.lightBackground || colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border || '#e0e0e0',
  },
  picker: {
    height: 150,  // Increased from 50 for better iOS visibility
    color: colors.textPrimary,
    backgroundColor: colors.lightBackground || colors.background,
  },
  pickerItem: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  quantityButton: {
    backgroundColor: colors.lightBackground,
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
  },
  quantityInput: {
    backgroundColor: colors.lightBackground,
    width: 80,
    height: 50,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  selectedDate: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  quickDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  quickDateButton: {
    backgroundColor: colors.lightBackground,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickDateText: {
    color: colors.textDark,
    fontWeight: '600',
    fontSize: 14,
  },
  dateButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearDateButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  clearDateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  datePickerWrapper: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  saveButtonGradient: {
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.large,
  },
  saveButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});