// TopBar - With Working Search Bar
import { Search, Bell, Settings, User, Moon, Sun } from 'lucide-react';
import { getColors, spacing, borderRadius } from '../colors';

export function TopBar({ onMenuClick, currentUser, onLogout, onSettingsClick, isDark, onToggleDark, onSearch, searchValue }) {
  const colors = getColors(isDark);

  return (
    <div style={{ background: colors.card, borderBottom: `1px solid ${colors.border}`, padding: `${spacing.lg} ${spacing.xxl}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease' }}>
      {/* Search Box */}
      <div style={{ flex: 1, maxWidth: '600px', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} />
        <input 
          type="text" 
          placeholder="Search items..." 
          value={searchValue || ''}
          onChange={(e) => onSearch(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 20px 12px 45px', 
            border: `2px solid ${colors.border}`, 
            borderRadius: borderRadius.lg, 
            fontSize: '15px', 
            background: colors.card, 
            color: colors.textPrimary 
          }} 
        />
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        <button onClick={onToggleDark} style={{ background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: borderRadius.md, color: colors.primary }} title={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button style={{ background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: borderRadius.md, color: colors.textSecondary }}>
          <Bell size={20} />
        </button>

        <button onClick={onSettingsClick} style={{ background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: borderRadius.md, color: colors.textSecondary }}>
          <Settings size={20} />
        </button>

        {currentUser && (
          <button style={{ background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: borderRadius.md, color: colors.textSecondary }}>
            <User size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

export default TopBar;