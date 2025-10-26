import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addItemManual } from '../services/api';
import { getDefaultLocations, getDefaultCategories } from '../utils/defaults';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';

export default function ManualAddScreen({ navigation }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [location, setLocation] = useState('Basement Pantry');
  const [category, setCategory] = useState('Uncategorized');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [locations, setLocations] = useState(['Basement Pantry']);
  const [categories, setCategories] = useState(['Uncategorized']);

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    const locs = await getDefaultLocations();
    const cats = await getDefaultCategories();
    setLocations(locs);
    setCategories(cats);
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
    if (!name.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    if (quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }

    setLoading(true);
    try {
      const expiryStr = expiryDate ? expiryDate.toISOString().split('T')[0] : null;
      await addItemManual({
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        category: category,
        location: location,
        quantity,
        expiry_date: expiryStr,
        notes: notes.trim() || null,
      });
      
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Manually</Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Flour"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., King Arthur"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Barcode (optional)</Text>
          <TextInput
            style={styles.input}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="e.g., 012345678901"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>🏷️ Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
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

        <View style={styles.inputCard}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g., 5lb bag, expires soon"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? 'Adding...' : 'Save Item'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  inputCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    marginBottom: spacing.xl,
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