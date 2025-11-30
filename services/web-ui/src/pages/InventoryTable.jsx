// Inventory Table - With Filtering Support
import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { getColors, spacing, borderRadius } from '../colors';
import { useItems } from '../hooks/useItems';
import { formatDate, getExpiryBadgeText, getExpiryStatus } from '../utils/dateUtils';

export function InventoryTable({ isDark, filters = {} }) {
  const colors = getColors(isDark);
  const { items, loading, removeItem } = useItems();
  const [sortBy, setSortBy] = useState('expiry');

  // Apply filters
  const filteredItems = items.filter(item => {
    // Filter by status
    if (filters.filter === 'expiring') {
      const status = getExpiryStatus(item.expiry_date);
      if (status !== 'warning' && status !== 'critical') return false;
    }
    if (filters.filter === 'expired') {
      const status = getExpiryStatus(item.expiry_date);
      if (status !== 'expired') return false;
    }
    // Filter by location
    if (filters.location && item.location !== filters.location) return false;
    // Filter by category
    if (filters.category && item.category !== filters.category) return false;
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'expiry') {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    }
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    return 0;
  });

  const getItemIcon = (category) => {
    const icons = { 'Canned Goods': '🥫', 'Dairy': '🥛', 'Beverages': '🧃', 'Bakery': '🍞', 'Produce': '🥬', 'Frozen': '🧊', 'Snacks': '🍿', 'Condiments': '🍯' };
    return icons[category] || '📦';
  };

  const getRowClass = (item) => {
    if (!item.expiry_date) return '';
    const status = getExpiryStatus(item.expiry_date);
    if (status === 'expired') return 'expired';
    if (status === 'warning' || status === 'critical') return 'warning';
    return '';
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete "${item.name}"?`)) {
      await removeItem(item.id);
    }
  };

  if (loading) {
    return <div style={{ padding: spacing.xxl, textAlign: 'center', color: colors.textSecondary }}>Loading items...</div>;
  }

  const getTitle = () => {
    if (filters.filter === 'expiring') return 'Expiring Soon';
    if (filters.filter === 'expired') return 'Expired Items';
    if (filters.location) return filters.location;
    if (filters.category) return filters.category;
    return 'All Items';
  };

  return (
    <div style={{ padding: `${spacing.xl} ${spacing.xxl}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
          {getTitle()}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.textSecondary, fontSize: '14px' }}>
          <span>Sort by:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', border: `2px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '14px', background: colors.card, color: colors.textPrimary, cursor: 'pointer' }}>
            <option value="expiry">Expiry Date (Soonest)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      <div style={{ background: colors.card, borderRadius: borderRadius.xl, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: isDark ? colors.cardHover : '#fafaf9', borderBottom: `2px solid ${colors.border}` }}>
              {['Item', 'Category', 'Location', 'Qty', 'Expiry Date', 'Actions'].map(header => (
                <th key={header} style={{ padding: `${spacing.lg} 20px`, textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => {
              const status = getExpiryStatus(item.expiry_date);
              const icon = getItemIcon(item.category);
              return (
                <tr key={item.id} className={getRowClass(item)}>
                  <td style={{ padding: `${spacing.lg} 20px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                      <div style={{ fontSize: '28px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.accentBg, borderRadius: borderRadius.md }}>{icon}</div>
                      <div>
                        <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '2px' }}>{item.name}</div>
                        {item.brand && <div style={{ fontSize: '13px', color: colors.textSecondary }}>{item.brand}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: `${spacing.lg} 20px` }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: isDark ? colors.cardHover : '#f5f5f4', borderRadius: borderRadius.sm, fontSize: '13px', color: isDark ? colors.textSecondary : '#57534e' }}>
                      🏷️ {item.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td style={{ padding: `${spacing.lg} 20px`, color: colors.textSecondary, fontSize: '13px' }}>📍 {item.location || 'No location'}</td>
                  <td style={{ padding: `${spacing.lg} 20px`, fontWeight: '600', color: colors.textPrimary }}>{item.quantity || 1}</td>
                  <td style={{ padding: `${spacing.lg} 20px` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '13px', color: colors.textPrimary }}>{item.expiry_date ? formatDate(item.expiry_date) : 'No expiry'}</div>
                      {item.expiry_date && (
                        <div style={{ fontSize: '12px', fontWeight: '600', color: status === 'expired' ? colors.expiredText : (status === 'warning' || status === 'critical') ? colors.warningText : colors.goodText }}>
                          {status === 'expired' || status === 'warning' || status === 'critical' ? '⚠️ ' : '✓ '}{getExpiryBadgeText(item.expiry_date)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: `${spacing.lg} 20px` }}>
                    <div style={{ display: 'flex', gap: spacing.sm }}>
                      <button onClick={() => onNavigate(`/add?id=${item.id}`)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: borderRadius.sm, color: colors.textSecondary }} onMouseOver={(e) => e.currentTarget.style.color = colors.info} onMouseOut={(e) => e.currentTarget.style.color = colors.textSecondary}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: borderRadius.sm, color: colors.textSecondary }} onMouseOver={(e) => e.currentTarget.style.color = colors.danger} onMouseOut={(e) => e.currentTarget.style.color = colors.textSecondary}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedItems.length === 0 && (
          <div style={{ padding: spacing.xxxl, textAlign: 'center', color: colors.textSecondary }}>
            {filters.filter || filters.location || filters.category ? 'No items match this filter.' : 'No items in your pantry. Click "Add New Item" to get started!'}
          </div>
        )}
      </div>
    </div>
  );
}

function NavSection({ title, children, colors }) {
  return (
    <div style={{ marginBottom: spacing.xl }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm, padding: `0 ${spacing.sm}` }}>{title}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick, colors, gradient }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: borderRadius.md, cursor: 'pointer', fontSize: '14px', marginBottom: '4px', background: active ? gradient.primary : (hover ? colors.accentBg : 'transparent'), color: active ? 'white' : colors.textPrimary, fontWeight: active ? '600' : '500', transition: 'all 0.2s' }}>
      {typeof icon === 'string' ? <span>{icon}</span> : icon}
      <span style={{ flex: 1 }}>{label}</span>
      {count > 0 && <span style={{ background: active ? 'rgba(255, 255, 255, 0.3)' : colors.accentBg, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{count}</span>}
    </div>
  );
}

export default InventoryTable;