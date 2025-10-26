import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { deleteItem, updateItem } from '../services/api';
import { getDefaultLocations, getDefaultCategories } from '../utils/defaults';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';

export default function ItemDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand || '');
  const [category, setCategory] = useState(item.category || 'Uncategorized');
  const [location, setLocation] = useState(item.location);
  const [quantity, setQuantity] = useState(item.quantity);
  const [expiryDate, setExpiryDate] = useState(item.expiry_date ? new Date(item.expiry_date) : null);
  const [notes, setNotes] = useState(item.notes || '');

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

  const getExpiryStyle = (expiryDate) => {
    if (!expiryDate) return {};
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { color: colors.error, fontWeight: 'bold' };
    if (daysUntilExpiry <= 7) return { color: colors.accent, fontWeight: 'bold' };
    return {};
  };

  const getExpiryText = (expiryDate) => {
    if (!expiryDate) return '';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return ' (Expired!)';
    if (daysUntilExpiry === 0) return ' (Today!)';
    if (daysUntilExpiry === 1) return ' (Tomorrow!)';
    if (daysUntilExpiry <= 7) return ` (${daysUntilExpiry} days)`;
    return '';
  };

  const handleSave = async () => {
    try {
      const expiryStr = expiryDate ? expiryDate.toISOString().split('T')[0] : null;
      await updateItem(item.id, {
        name: name.trim(),
        brand: brand.trim() || null,
        category: category.trim(),
        location: location.trim(),
        quantity: parseInt(quantity),
        expiry_date: expiryStr,
        notes: notes.trim() || null,
      });
      
      setEditing(false);
      Alert.alert('Success', 'Item updated!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
      console.error(error);
    }
  };

  const handleCancel = () => {
    setName(item.name);
    setBrand(item.brand || '');
    setCategory(item.category || 'Uncategorized');
    setLocation(item.location);
    setQuantity(item.quantity);
    setExpiryDate(item.expiry_date ? new Date(item.expiry_date) : null);
    setNotes(item.notes || '');
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Item',
      `Remove "${item.name}" from pantry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteItem(item.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editText}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {item.image_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.infoCard}>
        {editing ? (
          <>
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Item name"
              placeholderTextColor={colors.textSecondary}
            />
            
            <Text style={styles.label}>Brand (optional)</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        ) : (
          <>
            <Text style={styles.productName}>{item.name}</Text>
            {item.brand && (
              <Text style={styles.productBrand}>Brand: {item.brand}</Text>
            )}
          </>
        )}
      </View>

      <View style={styles.detailsCard}>
        {editing ? (
          <>
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

            <Text style={styles.label}>📝 Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🏷️ Category</Text>
              <Text style={styles.detailValue}>{item.category}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📍 Location</Text>
              <Text style={styles.detailValue}>{item.location}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}># Quantity</Text>
              <Text style={styles.detailValue}>×{item.quantity}</Text>
            </View>

            {item.expiry_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📅 Expires</Text>
                <Text style={[styles.detailValue, getExpiryStyle(item.expiry_date)]}>
                  {new Date(item.expiry_date).toLocaleDateString()}
                  {getExpiryText(item.expiry_date)}
                </Text>
              </View>
            )}

            {item.barcode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🏷️ Barcode</Text>
                <Text style={styles.detailValue}>{item.barcode}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📅 Added</Text>
              <Text style={styles.detailValue}>
                {new Date(item.added_date).toLocaleDateString()}
              </Text>
            </View>

            {item.manually_added && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✏️ Manual Entry</Text>
              </View>
            )}

            {item.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.detailLabel}>📝 Notes</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {editing ? (
        <View style={styles.editButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Removing...' : '🗑️ Remove from Pantry'}
          </Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  imageContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  productImage: {
    width: 250,
    height: 250,
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  productBrand: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
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
    marginTop: spacing.sm,
  },
  picker: {
    color: colors.textPrimary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.sm,
  },
  quantityButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  quantityButtonText: {
    fontSize: 20,
  },
  quantityInput: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 60,
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
  detailsCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  badgeText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  editButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  cancelButton: {
    backgroundColor: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.card,
  },
  deleteButton: {
    backgroundColor: colors.error,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});