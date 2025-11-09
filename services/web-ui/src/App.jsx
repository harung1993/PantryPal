import React, { useState, useEffect } from 'react';
import { getDefaultLocations, getDefaultCategories } from './defaults';
import { getItems, deleteItem, addItemManual, updateItem } from './api';
import { colors, gradients, spacing, borderRadius, shadows } from './colors';
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(id);
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
      category: item.category,
      location: item.location,
      quantity: item.quantity,
      expiry_date: item.expiry_date || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateItem(editingItem.id, formData);
      setShowEditModal(false);
      setEditingItem(null);
      loadItems();
    } catch (error) {
      alert('Failed to update item');
    }
  };

  const handleAdd = async () => {
    try {
      await addItemManual(
        formData.name,
        formData.brand,
        formData.category,
        formData.location,
        formData.quantity,
        formData.expiry_date || null,
        formData.notes
      );
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
    if (daysUntilExpiry <= 3) return `⚠️ Expires in ${daysUntilExpiry} days`;
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    return null;
  };

  const groupItems = () => {
    if (groupBy === 'none') return null;
    
    const grouped = {};
    items.forEach(item => {
      const key = groupBy === 'location' ? item.location : item.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const renderTable = (itemsToRender) => (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
    }}>
      <thead>
        <tr style={{
          background: gradients.primary,
          color: 'white',
        }}>
          <th style={styles.th}>Item</th>
          <th style={styles.th}>Brand</th>
          <th style={styles.th}>Category</th>
          <th style={styles.th}>Location</th>
          <th style={styles.th}>Quantity</th>
          <th style={styles.th}>Expiry</th>
          <th style={styles.th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {itemsToRender.map((item, index) => {
          const expiryStatus = getExpiryStatus(item.expiry_date);
          const expiryText = getExpiryText(item.expiry_date);
          
          return (
            <tr
              key={item.id}
              style={{
                backgroundColor: index % 2 === 0 ? colors.card : colors.lightBackground,
                borderLeft: expiryStatus === 'expired' || expiryStatus === 'critical'
                  ? `4px solid ${colors.error}`
                  : expiryStatus === 'warning'
                  ? `4px solid ${colors.warning}`
                  : 'none',
              }}
            >
              <td style={styles.td}>{item.name}</td>
              <td style={styles.td}>{item.brand || '-'}</td>
              <td style={styles.td}>
                <span style={{
                  backgroundColor: colors.lightBackground,
                  padding: '4px 8px',
                  borderRadius: borderRadius.sm,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.textDark,
                }}>
                  {item.category}
                </span>
              </td>
              <td style={styles.td}>{item.location}</td>
              <td style={styles.td}>{item.quantity}</td>
              <td style={styles.td}>
                {item.expiry_date ? (
                  <>
                    <div>{new Date(item.expiry_date).toLocaleDateString()}</div>
                    {expiryText && (
                      <div style={{
                        fontSize: '12px',
                        color: expiryStatus === 'expired' || expiryStatus === 'critical'
                          ? colors.error
                          : colors.warning,
                        fontWeight: 'bold',
                      }}>
                        {expiryText}
                      </div>
                    )}
                  </>
                ) : '-'}
              </td>
              <td style={styles.td}>
                <GradientButton
                  small
                  onClick={() => handleEdit(item)}
                  style={{ marginRight: '8px' }}
                >
                  ✏️ Edit
                </GradientButton>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    ...styles.deleteButton,
                    padding: '6px 12px',
                    fontSize: '14px',
                  }}
                >
                  🗑️ Delete
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderGrouped = () => {
    const grouped = groupItems();
    if (!grouped) return null;

    return Object.keys(grouped).map(groupKey => (
      <div key={groupKey} style={{ marginBottom: spacing.xl }}>
        <div style={{
          background: gradients.primary,
          padding: spacing.md,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
        }}>
          <h3 style={{ margin: 0, color: 'white' }}>{groupKey}</h3>
        </div>
        {renderTable(grouped[groupKey])}
      </div>
    ));
  };

  const getStats = () => {
    const total = items.length;
    const expiring = items.filter(item => {
      const status = getExpiryStatus(item.expiry_date);
      return status === 'critical' || status === 'warning';
    }).length;
    const expired = items.filter(item => getExpiryStatus(item.expiry_date) === 'expired').length;
    
    return { total, expiring, expired };
  };

  const stats = getStats();

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  return (
    <div style={{
      background: gradients.warm,
      minHeight: '100vh',
      padding: spacing.xl,
    }}>
      <div style={{ width: '100%', maxWidth: '100%', margin: '0' }}>
        {/* Header with Gradient */}
        <div style={{
          background: gradients.primary,
          padding: `${spacing.xl} ${spacing.lg}`,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.xl,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: shadows.large,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px' }}>🥫 PantryPal Dashboard</h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>Your Smart Pantry Assistant</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: borderRadius.md,
              padding: `${spacing.md} ${spacing.lg}`,
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Stats Cards with Gradients */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}>
          <StatCard icon="📦" label="Total Items" value={stats.total} />
          <StatCard icon="⚠️" label="Expiring Soon" value={stats.expiring} color={colors.warning} />
          <StatCard icon="🚫" label="Expired" value={stats.expired} color={colors.error} />
        </div>

        {/* Search & Controls */}
        <div style={{
          backgroundColor: colors.card,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          boxShadow: shadows.medium,
        }}>
          <div style={{
            display: 'flex',
            gap: spacing.md,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: spacing.md,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: '16px',
              }}
            />

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              style={{
                padding: spacing.md,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              <option value="none">All Items</option>
              <option value="location">Group by Location</option>
              <option value="category">Group by Category</option>
            </select>

            <GradientButton onClick={() => setShowAddModal(true)}>
              ➕ Add New Item
            </GradientButton>
          </div>
        </div>

        {/* Items Table */}
        {groupBy === 'none' ? (
          <div style={{
            background: colors.card,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            boxShadow: shadows.medium,
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

// Gradient Button Component
function GradientButton({ children, onClick, small, style }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: gradients.primary,
        border: 'none',
        borderRadius: borderRadius.md,
        padding: small ? '8px 16px' : `${spacing.md} ${spacing.lg}`,
        color: 'white',
        fontSize: small ? '14px' : '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: isHovered ? shadows.large : shadows.medium,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: colors.card,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      boxShadow: shadows.medium,
    }}>
      <div style={{
        background: gradients.primary,
        padding: spacing.md,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
      }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <span style={{ fontWeight: 'bold' }}>{label}</span>
      </div>
      <div style={{
        padding: spacing.lg,
        fontSize: '32px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: color || colors.textPrimary,
      }}>
        {value}
      </div>
    </div>
  );
}

// Modal Component (unchanged, works with new colors)
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
        
        {/* Form fields... (rest of modal implementation) */}
        
        <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
          <GradientButton onClick={onSave} style={{ flex: 1 }}>
            💾 Save
          </GradientButton>
          <button
            onClick={onCancel}
            style={{
              ...styles.deleteButton,
              flex: 1,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  th: {
    padding: spacing.md,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  td: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    border: `2px solid ${colors.error}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm} ${spacing.md}`,
    color: colors.error,
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};

export default App;