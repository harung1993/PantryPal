import React, { useState, useEffect } from 'react';
import { getDefaultLocations, getDefaultCategories } from './defaults';
import { getItems, deleteItem, addItemManual, updateItem } from './api';
import { colors, spacing, borderRadius } from './colors';
import SettingsPage from './SettingsPage';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('none');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Uncategorized',
    location: 'Basement Pantry',
    quantity: 1,
    expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    loadItems();
  }, [search]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getItems(null, search || null);
      
      const sorted = [...data].sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
      
      setItems(sorted);
    } catch (error) {
      console.error('Failed to load items:', error);
      alert('Failed to load items. Check Settings to configure backend URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId, itemName) => {
    if (window.confirm(`Remove "${itemName}" from pantry?`)) {
      try {
        await deleteItem(itemId);
        loadItems();
      } catch (error) {
        alert('Failed to delete item');
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      brand: item.brand || '',
      category: item.category || 'Uncategorized',
      location: item.location,
      quantity: item.quantity,
      expiry_date: item.expiry_date || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateItem(editingItem.id, {
        name: formData.name,
        brand: formData.brand || null,
        category: formData.category,
        location: formData.location,
        quantity: parseInt(formData.quantity),
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || null,
      });
      setShowEditModal(false);
      loadItems();
    } catch (error) {
      alert('Failed to update item');
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Item name is required');
      return;
    }

    try {
      await addItemManual({
        name: formData.name,
        brand: formData.brand || null,
        category: formData.category,
        location: formData.location,
        quantity: parseInt(formData.quantity),
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || null,
      });
      
      setShowAddModal(false);
      setFormData({
        name: '',
        brand: '',
        category: 'Uncategorized',
        location: 'Basement Pantry',
        quantity: 1,
        expiry_date: '',
        notes: '',
      });
      loadItems();
    } catch (error) {
      alert('Failed to add item');
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'expired';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'warning';
    return 'normal';
  };

  const getExpiryText = (expiryDate) => {
    if (!expiryDate) return '';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return '⚠️ Expired!';
    if (days === 0) return '⚠️ Today!';
    if (days === 1) return '⚠️ Tomorrow!';
    if (days <= 7) return `⚠️ ${days} days`;
    return `${days} days`;
  };

  const groupedItems = () => {
    if (groupBy === 'none') return null;
    
    const grouped = {};
    items.forEach(item => {
      const key = groupBy === 'location' ? item.location : item.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const stats = {
    total: items.length,
    expiringSoon: items.filter(i => {
      const status = getExpiryStatus(i.expiry_date);
      return status === 'critical' || status === 'warning' || status === 'expired';
    }).length,
    locations: new Set(items.map(i => i.location)).size,
    categories: new Set(items.map(i => i.category)).size,
  };

  const renderGrouped = () => {
    const grouped = groupedItems();
    if (!grouped) return null;

    return Object.entries(grouped).map(([groupName, groupItems]) => (
      <div key={groupName} style={{ marginBottom: spacing.lg }}>
        <h3 style={{
          background: colors.primary,
          padding: spacing.md,
          borderRadius: borderRadius.md,
          color: colors.textPrimary,
          margin: `${spacing.md} 0`,
        }}>
          {groupName} ({groupItems.length})
        </h3>
        <div style={{
          background: colors.card,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          {renderTable(groupItems)}
        </div>
      </div>
    ));
  };

  const renderTable = (itemsList) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: colors.primary }}>
          <th style={{ padding: spacing.md, textAlign: 'left', color: colors.textPrimary }}>Item</th>
          <th style={{ padding: spacing.md, textAlign: 'left', color: colors.textPrimary }}>Category</th>
          <th style={{ padding: spacing.md, textAlign: 'left', color: colors.textPrimary }}>Location</th>
          <th style={{ padding: spacing.md, textAlign: 'center', color: colors.textPrimary }}>Qty</th>
          <th style={{ padding: spacing.md, textAlign: 'left', color: colors.textPrimary }}>Expires</th>
          <th style={{ padding: spacing.md, textAlign: 'center', color: colors.textPrimary }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {itemsList.length === 0 ? (
          <tr>
            <td colSpan="6" style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
              No items found
            </td>
          </tr>
        ) : (
          itemsList.map((item, index) => {
            const expiryStatus = getExpiryStatus(item.expiry_date);
            const expiryText = getExpiryText(item.expiry_date);
            
            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                  background: index % 2 === 0 ? colors.card : colors.background,
                  borderLeft: expiryStatus === 'expired' || expiryStatus === 'critical' 
                    ? `4px solid ${colors.error}` 
                    : 'none',
                }}
              >
                <td style={{ padding: spacing.md }}>
                  <div style={{ fontWeight: '600', color: colors.textPrimary }}>{item.name}</div>
                  {item.brand && (
                    <div style={{ fontSize: '14px', color: colors.textSecondary }}>{item.brand}</div>
                  )}
                  {item.barcode && (
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
                      🏷️ {item.barcode}
                    </div>
                  )}
                </td>
                <td style={{ padding: spacing.md, color: colors.textSecondary }}>{item.category}</td>
                <td style={{ padding: spacing.md, color: colors.textSecondary }}>{item.location}</td>
                <td style={{ padding: spacing.md, textAlign: 'center', fontWeight: 'bold', color: colors.primary }}>
                  ×{item.quantity}
                </td>
                <td style={{ padding: spacing.md }}>
                  {expiryText ? (
                    <span style={{
                      color: expiryStatus === 'expired' || expiryStatus === 'critical' 
                        ? colors.error 
                        : expiryStatus === 'warning' 
                        ? colors.accent 
                        : colors.textSecondary,
                      fontWeight: '600',
                    }}>
                      {expiryText}
                    </span>
                  ) : (
                    <span style={{ color: colors.textSecondary }}>—</span>
                  )}
                </td>
                <td style={{ padding: spacing.md, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: spacing.xs, justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: borderRadius.sm,
                        border: 'none',
                        background: colors.scanButton,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      style={{
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: borderRadius.sm,
                        border: 'none',
                        background: colors.error,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  return (
    <div style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: colors.primary,
        padding: spacing.xl,
        marginBottom: spacing.lg,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '36px', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🥫</span>
              <span>PantryPal</span>
            </h1>
            <p style={{ margin: '8px 0 0 0', paddingLeft: '52px', color: colors.textSecondary }}>
            {items.length} items in pantry
          </p>
          </div>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: borderRadius.lg,
                border: 'none',
                background: colors.card,
                color: colors.textPrimary,
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              ⚙️
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: borderRadius.lg,
                border: 'none',
                background: colors.secondary,
                color: colors.textPrimary,
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              ➕ Add Item
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: `0 8px ${spacing.xl}` }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}>
          <div style={{
            background: colors.card,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
              {stats.total}
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              Total Items
            </div>
          </div>

          <div style={{
            background: colors.card,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.error }}>
              {stats.expiringSoon}
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              Expiring Soon
            </div>
          </div>

          <div style={{
            background: colors.card,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.scanButton }}>
              {stats.locations}
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              Locations
            </div>
          </div>

          <div style={{
            background: colors.card,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.secondary }}>
              {stats.categories}
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              Categories
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          background: colors.card,
          padding: spacing.lg,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.lg,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '250px',
                padding: spacing.md,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textSecondary, marginRight: spacing.xs }}>
                Group by:
              </span>
              <button
                onClick={() => setGroupBy('none')}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: borderRadius.md,
                  border: 'none',
                  background: groupBy === 'none' ? colors.primary : colors.card,
                  color: colors.textPrimary,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                None
              </button>
              <button
                onClick={() => setGroupBy('location')}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: borderRadius.md,
                  border: 'none',
                  background: groupBy === 'location' ? colors.primary : colors.card,
                  color: colors.textPrimary,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📍 Location
              </button>
              <button
                onClick={() => setGroupBy('category')}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: borderRadius.md,
                  border: 'none',
                  background: groupBy === 'category' ? colors.primary : colors.card,
                  color: colors.textPrimary,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🏷️ Category
              </button>
            </div>

            <button
              onClick={loadItems}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: borderRadius.md,
                border: 'none',
                background: colors.scanButton,
                color: colors.textPrimary,
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Items Display */}
        {groupBy === 'none' ? (
          <div style={{
            background: colors.card,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            marginBottom: spacing.xl,
          }}>
            {loading ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
                Loading...
              </div>
            ) : (
              renderTable(items)
            )}
          </div>
        ) : (
          <div style={{ marginBottom: spacing.xl }}>
            {renderGrouped()}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal
          title="Add New Item"
          formData={formData}
          setFormData={setFormData}
          onSave={handleAdd}
          onCancel={() => {
            setShowAddModal(false);
            setFormData({
              name: '',
              brand: '',
              category: 'Uncategorized',
              location: 'Basement Pantry',
              quantity: 1,
              expiry_date: '',
              notes: '',
            });
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <Modal
          title="Edit Item"
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveEdit}
          onCancel={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Modal Component
function Modal({ title, formData, setFormData, onSave, onCancel }) {
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    setLocations(getDefaultLocations());
    setCategories(getDefaultCategories());
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <h2 style={{ marginTop: 0, color: colors.textPrimary }}>{title}</h2>
        
        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            Item Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Flour"
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            Brand
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData({...formData, brand: e.target.value})}
            placeholder="e.g., King Arthur"
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            🏷️ Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
              backgroundColor: '#FEFEFE',
              color: colors.textPrimary,
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            📍 Location
          </label>
          <select
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
              backgroundColor: '#FEFEFE',
              color: colors.textPrimary,
            }}
          >
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            Quantity
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            min="1"
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            Expiry Date
          </label>
          <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                setFormData({...formData, expiry_date: date.toISOString().split('T')[0]});
              }}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: borderRadius.sm,
                border: 'none',
                background: colors.secondary,
                color: colors.textPrimary,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              +7 days
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setDate(date.getDate() + 30);
                setFormData({...formData, expiry_date: date.toISOString().split('T')[0]});
              }}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: borderRadius.sm,
                border: 'none',
                background: colors.secondary,
                color: colors.textPrimary,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              +1 month
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setMonth(date.getMonth() + 6);
                setFormData({...formData, expiry_date: date.toISOString().split('T')[0]});
              }}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: borderRadius.sm,
                border: 'none',
                background: colors.secondary,
                color: colors.textPrimary,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              +6 months
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setFullYear(date.getFullYear() + 1);
                setFormData({...formData, expiry_date: date.toISOString().split('T')[0]});
              }}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: borderRadius.sm,
                border: 'none',
                background: colors.secondary,
                color: colors.textPrimary,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              +1 year
            </button>
          </div>
          <input
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: '600', color: colors.textPrimary }}>
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Optional notes..."
            rows="3"
            style={{
              width: '100%',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              fontSize: '16px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: spacing.md }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: 'none',
              background: colors.textSecondary,
              color: colors.card,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              flex: 1,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: 'none',
              background: colors.primary,
              color: colors.textPrimary,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {title === 'Edit Item' ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;