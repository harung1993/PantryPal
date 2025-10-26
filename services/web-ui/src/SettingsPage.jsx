import React, { useState, useEffect } from 'react';
import { colors, spacing, borderRadius } from './colors';
import { getDefaultLocations, getDefaultCategories, saveDefaultLocations, saveDefaultCategories, DEFAULT_LOCATIONS, DEFAULT_CATEGORIES } from './defaults';
import { getItems, addItemManual } from './api';

function SettingsPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('connection');
  const [apiUrl, setApiUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  // CSV Export state
  const [exportFilter, setExportFilter] = useState('all');
  const [exportValue, setExportValue] = useState('');
  const [exporting, setExporting] = useState(false);

  // CSV Import state
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';
    setApiUrl(stored);
    setSavedUrl(stored);
    
    setLocations(getDefaultLocations());
    setCategories(getDefaultCategories());
  }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      const testUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const response = await fetch(`${testUrl}/health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        alert('✅ Connected successfully!\n\nBackend is healthy and responding.');
      } else {
        alert('⚠️ Backend responded but status is not healthy');
      }
    } catch (error) {
      alert('❌ Connection Failed\n\nCannot reach backend. Check the URL and make sure the backend is running.');
    } finally {
      setTesting(false);
    }
  };

  const saveConnectionSettings = () => {
    const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      alert('Invalid URL\n\nURL must start with http:// or https://');
      return;
    }

    localStorage.setItem('API_BASE_URL', cleanUrl);
    setSavedUrl(cleanUrl);
    alert('✅ Connection settings saved!\n\nPlease refresh the page for changes to take effect.');
  };

  const resetToDefault = () => {
    if (window.confirm('Reset API URL to default (http://localhost:8000)?')) {
      setApiUrl('http://localhost:8000');
    }
  };

  const addLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (location) => {
    setLocations(locations.filter(l => l !== location));
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (category) => {
    setCategories(categories.filter(c => c !== category));
  };

  const savePreferences = () => {
    saveDefaultLocations(locations);
    saveDefaultCategories(categories);
    alert('✅ Preferences saved!');
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const items = await getItems();
      
      let filteredItems = items;
      if (exportFilter === 'location' && exportValue) {
        filteredItems = items.filter(item => item.location === exportValue);
      } else if (exportFilter === 'category' && exportValue) {
        filteredItems = items.filter(item => item.category === exportValue);
      }

      if (filteredItems.length === 0) {
        alert('No items to export with the selected filter.');
        return;
      }

      const headers = ['ID', 'Name', 'Brand', 'Category', 'Location', 'Quantity', 'Expiry Date', 'Notes', 'Barcode', 'Added Date'];
      const rows = filteredItems.map(item => [
        item.id,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.brand || '').replace(/"/g, '""')}"`,
        `"${(item.category || 'Uncategorized').replace(/"/g, '""')}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`,
        item.quantity || 0,
        item.expiry_date || '',
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.barcode || '',
        item.added_at || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const filterSuffix = exportFilter === 'all' ? 'all' : 
                          exportFilter === 'location' ? `location-${exportValue}` :
                          `category-${exportValue}`;
      const filename = `pantrypal-export-${filterSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ Exported ${filteredItems.length} items successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setImportFile(file);
    parseCSVPreview(file);
  };

  const parseCSVPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 6).map(line => {
        // Simple CSV parser (handles quoted fields)
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        return values;
      });

      setImportPreview({
        headers,
        rows,
        totalRows: lines.length - 1,
      });
    };
    reader.readAsText(file);
  };

  const performImport = async () => {
    if (!importFile) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        // Get existing items to check for duplicates
        const existingItems = await getItems();
        const existingBarcodes = new Set(existingItems.map(item => item.barcode).filter(Boolean));

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of lines[i]) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));

            const item = {};
            headers.forEach((header, index) => {
              item[header.toLowerCase().replace(/ /g, '_')] = values[index] || '';
            });

            // Skip if barcode exists and skipDuplicates is enabled
            if (importOptions.skipDuplicates && item.barcode && existingBarcodes.has(item.barcode)) {
              skipCount++;
              continue;
            }

            // Prepare item data
            const itemData = {
              name: item.name || 'Unknown Item',
              brand: item.brand || null,
              category: item.category || 'Uncategorized',
              location: item.location || 'Basement Pantry',
              quantity: parseInt(item.quantity) || 1,
              expiry_date: item.expiry_date || null,
              notes: item.notes || '',
              barcode: item.barcode || null,
            };

            await addItemManual(itemData);
            successCount++;
          } catch (error) {
            console.error('Failed to import row:', error);
            errorCount++;
          }
        }

        alert(`✅ Import Complete!\n\n✓ ${successCount} items imported\n${skipCount > 0 ? `⊘ ${skipCount} duplicates skipped\n` : ''}${errorCount > 0 ? `✗ ${errorCount} errors` : ''}`);
        
        setImportFile(null);
        setImportPreview(null);
      };
      reader.readAsText(importFile);
    } catch (error) {
      console.error('Import failed:', error);
      alert('❌ Import failed. Please check the CSV format and try again.');
    } finally {
      setImporting(false);
    }
  };

  const cancelImport = () => {
    setImportFile(null);
    setImportPreview(null);
  };

  const tabs = [
    { id: 'connection', label: '🌐 Connection', icon: '🌐' },
    { id: 'importexport', label: '📥 Import/Export', icon: '📥' },
    { id: 'preferences', label: '⚙️ Preferences', icon: '⚙️' },
    { id: 'about', label: 'ℹ️ About', icon: 'ℹ️' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      padding: spacing.lg,
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: spacing.lg }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: colors.textPrimary,
              cursor: 'pointer',
              marginBottom: spacing.sm,
              fontWeight: '600',
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, color: colors.textPrimary }}>⚙️ Settings</h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: spacing.xs,
          marginBottom: spacing.lg,
          borderBottom: `2px solid ${colors.border}`,
          overflowX: 'auto',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                border: 'none',
                background: activeTab === tab.id ? colors.primary : 'transparent',
                color: colors.textPrimary,
                fontWeight: activeTab === tab.id ? 'bold' : '500',
                fontSize: '16px',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? `3px solid ${colors.primary}` : '3px solid transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'connection' && (
          <div>
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>Server Connection</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Configure the backend API URL. The server must be running and accessible.
              </p>

              <div style={{ marginTop: spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: spacing.sm,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  fontSize: '16px',
                }}>
                  Server URL
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://192.168.1.100:8000"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: `2px solid ${colors.border}`,
                    fontSize: '16px',
                    marginBottom: spacing.sm,
                  }}
                />
                <p style={{ 
                  fontSize: '14px', 
                  color: colors.textSecondary,
                  margin: `${spacing.sm} 0`,
                }}>
                  Examples: http://192.168.68.119:8000, http://macmini.local:8000
                </p>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: spacing.md, 
                marginTop: spacing.lg,
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={testConnection}
                  disabled={testing}
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    background: colors.scanButton,
                    color: colors.textPrimary,
                    fontWeight: 'bold',
                    cursor: testing ? 'not-allowed' : 'pointer',
                    opacity: testing ? 0.6 : 1,
                  }}
                >
                  {testing ? '🔄 Testing...' : '🔍 Test Connection'}
                </button>

                <button
                  onClick={resetToDefault}
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    background: colors.textSecondary,
                    color: colors.card,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ↺ Reset to Default
                </button>
              </div>

              <button
                onClick={saveConnectionSettings}
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                  border: 'none',
                  background: colors.primary,
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  marginTop: spacing.lg,
                }}
              >
                💾 Save Connection Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === 'importexport' && (
          <div>
            {/* Import Section */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>📤 Import from CSV</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Import items in bulk from a CSV file. File must have headers: Name, Brand, Category, Location, Quantity, Expiry Date, Notes, Barcode.
              </p>

              {!importPreview ? (
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportFileSelect}
                    style={{ display: 'none' }}
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    style={{
                      display: 'inline-block',
                      padding: spacing.lg,
                      borderRadius: borderRadius.lg,
                      border: `2px dashed ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textAlign: 'center',
                      width: '100%',
                      marginTop: spacing.md,
                    }}
                  >
                    📁 Choose CSV File
                  </label>

                  <div style={{ marginTop: spacing.lg }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginBottom: spacing.sm,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={importOptions.skipDuplicates}
                        onChange={(e) => setImportOptions({...importOptions, skipDuplicates: e.target.checked})}
                      />
                      <span style={{ color: colors.textPrimary }}>Skip duplicate barcodes</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: spacing.lg }}>
                  <h3 style={{ color: colors.textPrimary }}>Preview ({importPreview.totalRows} items)</h3>
                  <div style={{
                    overflowX: 'auto',
                    marginTop: spacing.md,
                    marginBottom: spacing.lg,
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                    }}>
                      <thead>
                        <tr style={{ background: colors.background }}>
                          {importPreview.headers.map((header, i) => (
                            <th key={i} style={{
                              padding: spacing.sm,
                              textAlign: 'left',
                              borderBottom: `2px solid ${colors.border}`,
                              fontWeight: 'bold',
                            }}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} style={{
                                padding: spacing.sm,
                                borderBottom: `1px solid ${colors.border}`,
                              }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', gap: spacing.md }}>
                    <button
                      onClick={performImport}
                      disabled={importing}
                      style={{
                        flex: 1,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        border: 'none',
                        background: colors.primary,
                        color: colors.textPrimary,
                        fontWeight: 'bold',
                        cursor: importing ? 'not-allowed' : 'pointer',
                        opacity: importing ? 0.6 : 1,
                      }}
                    >
                      {importing ? '⏳ Importing...' : `📤 Import ${importPreview.totalRows} Items`}
                    </button>
                    <button
                      onClick={cancelImport}
                      disabled={importing}
                      style={{
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        border: 'none',
                        background: colors.textSecondary,
                        color: colors.card,
                        fontWeight: 'bold',
                        cursor: importing ? 'not-allowed' : 'pointer',
                        opacity: importing ? 0.6 : 1,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export Section */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>📥 Export to CSV</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Export your pantry inventory to a CSV file for backup or analysis.
              </p>

              <div style={{ marginTop: spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: spacing.sm,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  fontSize: '16px',
                }}>
                  Export Filter
                </label>
                <select
                  value={exportFilter}
                  onChange={(e) => {
                    setExportFilter(e.target.value);
                    setExportValue('');
                  }}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: `2px solid ${colors.border}`,
                    fontSize: '16px',
                    marginBottom: spacing.md,
                    backgroundColor: colors.background,
                  }}
                >
                  <option value="all">All Items</option>
                  <option value="location">Filter by Location</option>
                  <option value="category">Filter by Category</option>
                </select>

                {exportFilter === 'location' && (
                  <select
                    value={exportValue}
                    onChange={(e) => setExportValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      border: `2px solid ${colors.border}`,
                      fontSize: '16px',
                      marginBottom: spacing.md,
                      backgroundColor: colors.background,
                    }}
                  >
                    <option value="">Select Location</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}

                {exportFilter === 'category' && (
                  <select
                    value={exportValue}
                    onChange={(e) => setExportValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      border: `2px solid ${colors.border}`,
                      fontSize: '16px',
                      marginBottom: spacing.md,
                      backgroundColor: colors.background,
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={exportToCSV}
                  disabled={exporting || (exportFilter !== 'all' && !exportValue)}
                  style={{
                    width: '100%',
                    padding: spacing.lg,
                    borderRadius: borderRadius.lg,
                    border: 'none',
                    background: exportFilter !== 'all' && !exportValue ? colors.border : colors.accent,
                    color: colors.textPrimary,
                    fontWeight: 'bold',
                    cursor: exportFilter !== 'all' && !exportValue ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    opacity: exportFilter !== 'all' && !exportValue ? 0.5 : 1,
                  }}
                >
                  {exporting ? '⏳ Exporting...' : '📥 Export to CSV'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div>
            {/* Default Locations */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>📍 Default Locations</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Manage your storage locations. These will appear in dropdowns when adding items.
              </p>

              {locations.map((location, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing.md,
                  backgroundColor: colors.background,
                  borderRadius: borderRadius.sm,
                  marginBottom: spacing.xs,
                }}>
                  <span style={{ fontSize: '16px', color: colors.textPrimary }}>{location}</span>
                  <button
                    onClick={() => removeLocation(location)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      color: colors.error,
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      padding: spacing.xs,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  placeholder="New location name"
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: `2px solid ${colors.border}`,
                    fontSize: '16px',
                  }}
                />
                <button
                  onClick={addLocation}
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    background: colors.secondary,
                    color: colors.textPrimary,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Default Categories */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>🏷️ Default Categories</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Manage product categories for better organization and filtering.
              </p>

              {categories.map((category, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing.md,
                  backgroundColor: colors.background,
                  borderRadius: borderRadius.sm,
                  marginBottom: spacing.xs,
                }}>
                  <span style={{ fontSize: '16px', color: colors.textPrimary }}>{category}</span>
                  <button
                    onClick={() => removeCategory(category)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      color: colors.error,
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      padding: spacing.xs,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="New category name"
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: `2px solid ${colors.border}`,
                    fontSize: '16px',
                  }}
                />
                <button
                  onClick={addCategory}
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    background: colors.secondary,
                    color: colors.textPrimary,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            <button
              onClick={savePreferences}
              style={{
                width: '100%',
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                border: 'none',
                background: colors.primary,
                color: colors.textPrimary,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '18px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              💾 Save Preferences
            </button>
          </div>
        )}

        {activeTab === 'about' && (
          <div style={{
            background: colors.card,
            padding: spacing.xl,
            borderRadius: borderRadius.lg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <h2 style={{ marginTop: 0, color: colors.textPrimary }}>About PantryPal</h2>
            <div style={{ display: 'grid', gap: spacing.md }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: spacing.sm,
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <span style={{ color: colors.textSecondary }}>App Version</span>
                <span style={{ color: colors.textPrimary, fontWeight: '600' }}>1.1.0</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: spacing.sm,
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <span style={{ color: colors.textSecondary }}>Current Server</span>
                <span style={{ 
                  color: colors.textPrimary, 
                  fontWeight: '500',
                  wordBreak: 'break-all',
                  textAlign: 'right',
                  maxWidth: '60%',
                }}>
                  {savedUrl}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Platform</span>
                <span style={{ color: colors.textPrimary, fontWeight: '600' }}>Web Dashboard</span>
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: spacing.xl,
              paddingTop: spacing.xl,
            }}>
              <div style={{ fontSize: '32px', marginBottom: spacing.sm }}>🥫</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.textPrimary }}>
                PantryPal
              </div>
              <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: spacing.xs }}>
                Self-hosted pantry management
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;