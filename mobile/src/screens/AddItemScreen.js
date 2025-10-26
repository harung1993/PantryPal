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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.successBanner}>
        <Text style={styles.successEmoji}>✨</Text>
        <Text style={styles.successText}>Found Product!</Text>
      </View>

      {productInfo.image_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: productInfo.image_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.productName}>{productInfo.name}</Text>
        {productInfo.brand && (
          <Text style={styles.productBrand}>Brand: {productInfo.brand}</Text>
        )}
        {productInfo.category && (
          <Text style={styles.productCategory}>Category: {productInfo.category}</Text>
        )}
        {productInfo.source && (
          <Text style={styles.productSource}>Source: {productInfo.source}</Text>
        )}
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.label}>📍 Location</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={location}
            onValueChange={(itemValue) => setLocation(itemValue)}
            style={styles.picker}
          >
            {locations.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} />
            ))}
          </Picker>
        </View>
      </View>

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

      <View style={styles.inputCard}>
        <Text style={styles.label}>📅 Expiry Date (optional)</Text>
        
        <View style={styles.quickDateButtons}>
          <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(7)}>
            <Text style={styles.quickDateText}>+7d</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(30)}>
            <Text style={styles.quickDateText}>+1m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(180)}>
            <Text style={styles.quickDateText}>+6m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(365)}>
            <Text style={styles.quickDateText}>+1y</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            {expiryDate ? expiryDate.toLocaleDateString() : 'Tap to select date'}
          </Text>
          <Text style={styles.datePickerIcon}>📅</Text>
        </TouchableOpacity>

        {expiryDate && (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => setExpiryDate(null)}
          >
            <Text style={styles.clearDateText}>✕ Clear date</Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={expiryDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.addButton, loading && styles.addButtonDisabled]}
        onPress={handleAdd}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>
          {loading ? 'Adding...' : 'Add to Pantry'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  successEmoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  imageContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  productImage: {
    width: 200,
    height: 200,
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  productBrand: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  productCategory: {
    fontSize: 16,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  productSource: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
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
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  quantityButton: {
    width: 60,
    height: 60,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  quantityButtonText: {
    fontSize: 24,
  },
  quantityInput: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 80,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    ...shadows.small,
  },
  quickDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  datePickerButton: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  datePickerIcon: {
    fontSize: 20,
  },
  clearDateButton: {
    marginTop: spacing.xs,
    alignSelf: 'center',
  },
  clearDateText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.medium,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});