// Inventory page - full item list with filtering and bulk actions
import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import FilterPanel from '../components/FilterPanel';
import BulkActions from '../components/BulkActions';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import { colors, spacing, borderRadius } from '../colors';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { downloadCSVTemplate, readCSVFile, validateImportedItems } from '../utils/exportUtils';
import { filterByExpiryStatus, sortByExpiry } from '../utils/dateUtils';
import { exportItemsCSV } from '../api';

export function InventoryPage() {
  const { items, loading, error, removeItems, addItem } = useItems();
  const { locations, categories } = useLocations();
  const [filters, setFilters] = useState({ expiryStatus: 'all' });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState(null);
  const [groupBy, setGroupBy] = useState('none');

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

  const handleExport = async () => {
    try {
      await exportItemsCSV();
    } catch (err) {
      alert('Failed to export items');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const importedItems = await readCSVFile(file);
      const validation = validateImportedItems(importedItems);
      
      if (!validation.isValid) {
        setImportError(validation.errors.join(', '));
        return;
      }

      for (const item of importedItems) {
        await addItem(item);
      }
      
      setShowImportModal(false);
      alert(`Successfully imported ${importedItems.length} items`);
    } catch (err) {
      setImportError(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: spacing.xl }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Inventory</h1>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <button
            onClick={() => downloadCSVTemplate()}
            style={{
              background: 'none',
              border: `2px solid ${colors.border}`,
              padding: `${spacing.md} ${spacing.lg}`,
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              fontSize: '14px',
            }}
          >
            <Download size={18} />
            Template
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              background: colors.info,
              border: 'none',
              padding: `${spacing.md} ${spacing.lg}`,
              borderRadius: borderRadius.md,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <Upload size={18} />
            Import CSV
          </button>
          <button
            onClick={handleExport}
            style={{
              background: colors.success,
              border: 'none',
              padding: `${spacing.md} ${spacing.lg}`,
              borderRadius: borderRadius.md,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        locations={locations}
        categories={categories}
      />

      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
        <label style={{ fontSize: '14px', fontWeight: '500' }}>Group by:</label>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ padding: spacing.sm, borderRadius: borderRadius.sm }}>
          <option value="none">None</option>
          <option value="location">Location</option>
          <option value="category">Category</option>
        </select>
      </div>

      {Object.entries(groupedItems).map(([group, groupItems]) => (
        <div key={group} style={{ marginBottom: spacing.xxl }}>
          {groupBy !== 'none' && (
            <h2 style={{ marginBottom: spacing.lg, fontSize: '20px', fontWeight: 'bold', color: colors.textSecondary }}>
              {group} ({groupItems.length})
            </h2>
          )}
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
        </div>
      ))}

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

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Items from CSV">
        {importError && <Alert type="error" message={importError} onClose={() => setImportError(null)} />}
        <div style={{ marginBottom: spacing.lg }}>
          <p>Upload a CSV file with your pantry items. Make sure it includes at least a "Name" column.</p>
          <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: spacing.sm }}>
            Download the template first if you need a reference format.
          </p>
        </div>
        <input type="file" accept=".csv" onChange={handleImport} style={{ width: '100%', padding: spacing.md }} />
      </Modal>
    </div>
  );
}

export default InventoryPage;
