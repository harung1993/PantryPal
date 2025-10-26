  import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { getItems, deleteItem } from '../services/api';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';

export default function HomeScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('none');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getItems(null, search || null);
      
      const sortedData = [...data].sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
      
      setItems(sortedData);
      groupItems(sortedData, groupBy);
    } catch (error) {
      Alert.alert('Error', 'Failed to load items');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, groupBy]);

  const groupItems = (itemsList, groupType) => {
    if (groupType === 'none') {
      setGroupedItems([]);
      return;
    }

    const grouped = {};
    itemsList.forEach(item => {
      const key = groupType === 'location' ? item.location : item.category;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    const sections = Object.keys(grouped).map(key => ({
      title: key,
      data: grouped[key],
    }));

    setGroupedItems(sections);
  };

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadItems();
    });
    return unsubscribe;
  }, [navigation, loadItems]);

  useEffect(() => {
    groupItems(items, groupBy);
  }, [groupBy, items]);

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'critical';
    if (daysUntilExpiry <= 7) return 'warning';
    return 'normal';
  };

  const getExpiryText = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return '⚠️ Expired!';
    if (daysUntilExpiry === 0) return '⚠️ Expires Today!';
    if (daysUntilExpiry === 1) return '⚠️ Expires Tomorrow!';
    if (daysUntilExpiry <= 7) return `⚠️ ${daysUntilExpiry} days left`;
    return `${daysUntilExpiry} days`;
  };

  const getExpiryColor = (status) => {
    switch (status) {
      case 'expired':
      case 'critical':
        return colors.error;
      case 'warning':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  const renderItem = ({ item }) => {
    const expiryStatus = getExpiryStatus(item.expiry_date);
    const expiryText = getExpiryText(item.expiry_date);
    
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          expiryStatus === 'expired' && styles.itemCardExpired,
          expiryStatus === 'critical' && styles.itemCardCritical,
        ]}
        onPress={() => navigation.navigate('ItemDetail', { item })}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemQuantity}>×{item.quantity}</Text>
        </View>
        
        {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        
        {groupBy === 'category' && (
          <Text style={styles.itemLocation}>📍 {item.location}</Text>
        )}
        {groupBy === 'location' && (
          <Text style={styles.categoryBadge}>🏷️ {item.category}</Text>
        )}
        {groupBy === 'none' && (
          <>
            <Text style={styles.itemLocation}>📍 {item.location}</Text>
            <Text style={styles.categoryBadge}>🏷️ {item.category}</Text>
          </>
        )}
        
        {expiryText && (
          <Text style={[styles.expiryText, { color: getExpiryColor(expiryStatus) }]}>
            {expiryText}
          </Text>
        )}
        
        {item.manually_added && (
          <Text style={styles.manualBadge}>✏️ Manual Entry</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>🥫 PantryPal</Text>
            <Text style={styles.count}>{items.length} items</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search items..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadItems}
        />

        <View style={styles.groupByContainer}>
          <Text style={styles.groupByLabel}>Group by:</Text>
          <View style={styles.toggleButtons}>
            <TouchableOpacity
              style={[styles.toggleButton, groupBy === 'none' && styles.toggleButtonActive]}
              onPress={() => setGroupBy('none')}
            >
              <Text style={[styles.toggleButtonText, groupBy === 'none' && styles.toggleButtonTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.toggleButton, groupBy === 'location' && styles.toggleButtonActive]}
              onPress={() => setGroupBy('location')}
            >
              <Text style={[styles.toggleButtonText, groupBy === 'location' && styles.toggleButtonTextActive]}>
                📍 Location
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.toggleButton, groupBy === 'category' && styles.toggleButtonActive]}
              onPress={() => setGroupBy('category')}
            >
              <Text style={[styles.toggleButtonText, groupBy === 'category' && styles.toggleButtonTextActive]}>
                🏷️ Category
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.scanButton]}
            onPress={() => navigation.navigate('Scanner')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>📷</Text>
            <Text style={styles.buttonText}>Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.manualButton]}
            onPress={() => navigation.navigate('ManualAdd')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>✏️</Text>
            <Text style={styles.buttonText}>Manual</Text>
          </TouchableOpacity>
        </View>

        {groupBy === 'none' ? (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => {
                  setRefreshing(true);
                  loadItems();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🥫</Text>
                <Text style={styles.emptyText}>
                  {loading ? 'Loading...' : 'Your pantry is empty'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {loading ? '' : 'Tap "Scan" to add items'}
                </Text>
              </View>
            }
          />
        ) : (
          <SectionList
            sections={groupedItems}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => {
                  setRefreshing(true);
                  loadItems();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🥫</Text>
                <Text style={styles.emptyText}>
                  {loading ? 'Loading...' : 'Your pantry is empty'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {loading ? '' : 'Tap "Scan" to add items'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: 60,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settingsButton: {
    padding: spacing.sm,
  },
  settingsIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  count: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  groupByContainer: {
    marginBottom: spacing.md,
  },
  groupByLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    ...shadows.small,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    ...shadows.medium,
  },
  scanButton: {
    backgroundColor: colors.scanButton,
  },
  manualButton: {
    backgroundColor: colors.secondary,
  },
  buttonEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  itemCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  itemCardExpired: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  itemCardCritical: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemQuantity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  itemBrand: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    fontSize: 14,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  expiryText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  manualBadge: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 20,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});