// Inventory page - full item list with filtering and bulk actions
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import FilterPanel from '../components/FilterPanel';
import BulkActions from '../components/BulkActions';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { colors, spacing, borderRadius } from '../colors';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { exportToCSV } from '../utils/exportUtils';
import { filterByExpiryStatus, sortByExpiry } from '../utils/dateUtils';

export function InventoryPage({ isDark }) {
  const { items, loading, error, removeItems } = useItems();
  const { locations, categories } = useLocations();
  const [filters, setFilters] = useState({ expiryStatus: 'all' });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Apply filters
  const filteredItems = items.filter(item => {
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.location && item.location !== filters.location) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.expiryStatus !== 'all') {
      return filterByExpiryStatus([item], filters.expiryStatus).length > 0;
    }
    return true;
  });

  const sortedItems = sortByExpiry(filteredItems);

  // Grouping logic
  const groupedItems = groupBy === 'none' ? { 'All Items': sortedItems } :
    sortedItems.reduce((groups, item) => {
      const key = groupBy === 'location' ? (item.location || 'No Location') :
                  groupBy === 'category' ? (item.category || 'No Category') : 'All Items';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Collapse all groups by default when grouping changes
  useEffect(() => {
    if (groupBy !== 'none') {
      const allGroupKeys = Object.keys(groupedItems);
      setCollapsedGroups(new Set(allGroupKeys));
    } else {
      setCollapsedGroups(new Set());
    }
  }, [groupBy]);

  // Auto-expand groups when search is active and has matches
  useEffect(() => {
    if (filters.search && groupBy !== 'none') {
      const groupsWithMatches = Object.entries(groupedItems)
        .filter(([_, items]) => items.length > 0)
        .map(([key, _]) => key);

      setCollapsedGroups(prev => {
        const next = new Set(prev);
        groupsWithMatches.forEach(key => next.delete(key));
        return next;
      });
    }
  }, [filters.search, groupedItems, groupBy]);

  const handleSelect = (item) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedItems.size} items?`)) {
      try {
        await removeItems(Array.from(selectedItems));
        setSelectedItems(new Set());
      } catch (err) {
        alert('Failed to delete items');
      }
    }
  };

  const handleExport = () => {
    const selected = items.filter(item => selectedItems.has(item.id));
    exportToCSV(selected.length > 0 ? selected : items);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: spacing.xl }}>
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Inventory</h1>
      </div>

      {error && <Alert type="error" message={error} />}

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        locations={locations}
        categories={categories}
        isDark={isDark}
      />

      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
        <label style={{ fontSize: '14px', fontWeight: '500' }}>Group by:</label>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ padding: spacing.sm, borderRadius: borderRadius.sm }}>
          <option value="none">None</option>
          <option value="location">Location</option>
          <option value="category">Category</option>
        </select>
      </div>

      {Object.entries(groupedItems)
        .filter(([_, groupItems]) => groupItems.length > 0)
        .map(([group, groupItems]) => {
          const isCollapsed = collapsedGroups.has(group);
          const Icon = isCollapsed ? ChevronRight : ChevronDown;

          return (
            <div key={group} style={{ marginBottom: spacing.xxl }}>
              {groupBy !== 'none' && (
                <div
                  onClick={() => toggleGroup(group)}
                  style={{
                    marginBottom: spacing.lg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    transition: 'background-color 0.2s',
                    backgroundColor: isCollapsed ? colors.background : 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isCollapsed ? colors.background : 'transparent'}
                >
                  <Icon size={20} color={colors.textSecondary} />
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: colors.textSecondary }}>
                    {group} ({groupItems.length})
                  </h2>
                </div>
              )}
              {!isCollapsed && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: spacing.lg }}>
                  {groupItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItems.has(item.id)}
                      onSelect={handleSelect}
                      onEdit={() => {}}
                      onDelete={() => removeItems([item.id])}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      }

      {sortedItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: spacing.xxxl, color: colors.textSecondary }}>
          No items found. Try adjusting your filters or add new items.
        </div>
      )}

      <BulkActions
        selectedCount={selectedItems.size}
        onDelete={handleBulkDelete}
        onExport={handleExport}
        onClear={() => setSelectedItems(new Set())}
      />
    </div>
  );
}

export default InventoryPage;
