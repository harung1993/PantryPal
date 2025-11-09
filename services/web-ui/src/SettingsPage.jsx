import React, { useState, useEffect } from 'react';
import { colors, spacing, borderRadius } from './colors';
import { getDefaultLocations, getDefaultCategories, saveDefaultLocations, saveDefaultCategories, DEFAULT_LOCATIONS, DEFAULT_CATEGORIES } from './defaults';
import { getItems, addItemManual } from './api';

function SettingsPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('connection');
  const [apiUrl, setApiUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  const [exportFilter, setExportFilter] = useState('all');
  const [exportValue, setExportValue] = useState('');
  const [exporting, setExporting] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
  });

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('API_BASE_URL') || 'http://localhost';
    setApiUrl(stored);
    setSavedUrl(stored);
    
    // Load API key
    const savedApiKey = localStorage.getItem('API_KEY');
    setCurrentApiKey(savedApiKey || '');
    setShowApiKeyInput(!!savedApiKey);
    
    setLocations(getDefaultLocations());
    setCategories(getDefaultCategories());

    // Load API keys and check auth status
    checkAuthStatus(stored);
    loadApiKeys(stored);
  }, []);

  const checkAuthStatus = async (url) => {
    try {
      const response = await fetch(`${url}/api/items`);
      setAuthEnabled(response.status === 401);
    } catch (error) {
      console.log('Could not check auth status');
    }
  };

  const loadApiKeys = async (url) => {
    try {
      setLoadingKeys(true);
      const response = await fetch(`${url}/api/auth/keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.log('Error loading API keys:', error);
    } finally {
      setLoadingKeys(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/auth/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          description: newKeyDescription || null,
          expires_in_days: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.api_key);
        setNewKeyName('');
        setNewKeyDescription('');
        setShowNewKeyForm(false);
        await loadApiKeys(apiUrl);
        
        alert('⚠️ API Key Generated!\n\nYour API key has been generated. Copy it now - it won\'t be shown again!');
      } else {
        alert('Failed to generate API key');
      }
    } catch (error) {
      alert(`Failed to generate API key: ${error.message}`);
    }
  };

  const deleteApiKey = async (keyId, keyName) => {
    if (!window.confirm(`Are you sure you want to delete "${keyName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/auth/keys/${keyId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadApiKeys(apiUrl);
        alert('API key deleted successfully');
      }
    } catch (error) {
      alert('Failed to delete API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

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
    
    // Save API key if provided
    if (currentApiKey.trim()) {
      localStorage.setItem('API_KEY', currentApiKey.trim());
    } else {
      localStorage.removeItem('API_KEY');
    }
    
    alert('✅ Connection settings saved!\n\nPlease refresh the page for changes to take effect.');
  };

  const resetToDefault = () => {
    if (window.confirm('Reset API URL to default (http://localhost)?')) {
      setApiUrl('http://localhost');
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

            if (importOptions.skipDuplicates && item.barcode && existingBarcodes.has(item.barcode)) {
              skipCount++;
              continue;
            }

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
    { id: 'connection', label: '🌐 Connection' },
    { id: 'apikeys', label: '🔑 API Keys' },
    { id: 'importexport', label: '📥 Import/Export' },
    { id: 'preferences', label: '⚙️ Preferences' },
    { id: 'about', label: 'ℹ️ About' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
    }}>
      {/* Sticky Header + Tabs */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: colors.background,
        zIndex: 100,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: spacing.lg,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', paddingLeft: spacing.lg, paddingRight: spacing.lg }}>
          <div style={{ marginBottom: spacing.md }}>
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

          <div style={{
            display: 'flex',
            gap: spacing.xs,
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
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto',
        padding: spacing.lg,
        paddingBottom: '200px',
      }}>
        {activeTab === 'connection' && (
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
                  backgroundColor: '#ffffff',
                  color: colors.textPrimary,
                }}
              />
              <p style={{ 
                fontSize: '14px', 
                color: colors.textSecondary,
                margin: `${spacing.sm} 0`,
              }}>
                Examples: http://192.168.68.119, http://macmini.local
              </p>
            </div>

            {/* API Key Section */}
            <div style={{
              marginTop: spacing.xl,
              paddingTop: spacing.xl,
              borderTop: `2px solid ${colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                }}>
                  Use API Key (Optional)
                </label>
                <button
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    backgroundColor: showApiKeyInput ? colors.primary : colors.border,
                    color: showApiKeyInput ? colors.textPrimary : colors.textSecondary,
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {showApiKeyInput ? '🔒 Enabled' : '🔓 Disabled'}
                </button>
              </div>

              {showApiKeyInput && (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontWeight: '600',
                    color: colors.textPrimary,
                    fontSize: '16px',
                  }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={currentApiKey}
                    onChange={(e) => setCurrentApiKey(e.target.value)}
                    placeholder="pp_xxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      border: `2px solid ${colors.border}`,
                      fontSize: '16px',
                      marginBottom: spacing.sm,
                      backgroundColor: '#ffffff',
                      color: colors.textPrimary,
                      fontFamily: 'monospace',
                    }}
                  />
                  <p style={{ 
                    fontSize: '14px', 
                    color: colors.textSecondary,
                    margin: `${spacing.sm} 0`,
                  }}>
                    💡 Required if server has AUTH_MODE=api_key_only or AUTH_MODE=full<br/>
                    Generate keys in Settings → API Keys tab
                  </p>
                  {currentApiKey && (
                    <button
                      onClick={() => {
                        if (window.confirm('Remove saved API key?')) {
                          localStorage.removeItem('API_KEY');
                          setCurrentApiKey('');
                          alert('API key removed');
                        }
                      }}
                      style={{
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        border: 'none',
                        background: colors.error,
                        color: colors.card,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: spacing.sm,
                      }}
                    >
                      🗑️ Clear API Key
                    </button>
                  )}
                </div>
              )}
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
        )}

        {activeTab === 'apikeys' && (
          <div>
            {/* Auth Status Card */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>🔐 Authentication Status</h2>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing.md,
                backgroundColor: colors.background,
                borderRadius: borderRadius.md,
                marginBottom: spacing.sm,
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs }}>
                    {authEnabled ? 'API keys required' : 'Open access (no auth)'}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    {authEnabled ? 'Authentication is enabled on your server' : 'No authentication required'}
                  </div>
                </div>
                <div style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: '999px',
                  backgroundColor: authEnabled ? '#D1FAE5' : '#E5E7EB',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: authEnabled ? '#065F46' : '#6B7280',
                }}>
                  {authEnabled ? '🔒 On' : '🔓 Off'}
                </div>
              </div>
              
              {!authEnabled && (
                <div style={{
                  padding: spacing.md,
                  backgroundColor: '#DBEAFE',
                  borderRadius: borderRadius.md,
                  border: '1px solid #93C5FD',
                  marginTop: spacing.sm,
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1E40AF', lineHeight: 1.5 }}>
                    💡 Authentication is disabled. To enable it, set REQUIRE_AUTH=true in docker-compose.yml
                  </p>
                </div>
              )}
            </div>

            {/* Generated Key Display */}
            {generatedKey && (
              <div style={{
                backgroundColor: '#FEF3C7',
                padding: spacing.xl,
                borderRadius: borderRadius.lg,
                border: '2px solid #FCD34D',
                marginBottom: spacing.lg,
              }}>
                <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 'bold', color: colors.textPrimary }}>
                  ⚠️ Save This Key Now!
                </h3>
                <p style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.5, marginBottom: spacing.md }}>
                  This is the only time you'll see this key. Copy it and store it securely.
                </p>
                <div style={{
                  backgroundColor: colors.card,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  border: '1px solid #FCD34D',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  marginBottom: spacing.md,
                }}>
                  {generatedKey}
                </div>
                <button
                  onClick={() => copyToClipboard(generatedKey)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    backgroundColor: '#F59E0B',
                    color: colors.card,
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                    marginBottom: spacing.sm,
                  }}
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={() => setGeneratedKey(null)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    backgroundColor: '#E5E7EB',
                    color: '#374151',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  I've Saved It
                </button>
              </div>
            )}

            {/* API Keys Management */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <h2 style={{ margin: 0, color: colors.textPrimary }}>Your API Keys</h2>
                <button
                  onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    backgroundColor: colors.primary,
                    color: colors.textPrimary,
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {showNewKeyForm ? '✕ Cancel' : '+ New Key'}
                </button>
              </div>

              {/* New Key Form */}
              {showNewKeyForm && (
                <div style={{
                  backgroundColor: colors.background,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.md,
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md, marginTop: 0 }}>
                    Create New API Key
                  </h3>
                  <input
                    type="text"
                    placeholder="Name (e.g., Home Assistant)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      border: `2px solid ${colors.border}`,
                      fontSize: '16px',
                      marginBottom: spacing.sm,
                      backgroundColor: '#ffffff',
                      color: colors.textPrimary,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newKeyDescription}
                    onChange={(e) => setNewKeyDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      border: `2px solid ${colors.border}`,
                      fontSize: '16px',
                      marginBottom: spacing.sm,
                      backgroundColor: '#ffffff',
                      color: colors.textPrimary,
                    }}
                  />
                  <button
                    onClick={generateApiKey}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      border: 'none',
                      backgroundColor: '#10B981',
                      color: colors.card,
                      fontWeight: '600',
                      fontSize: '16px',
                      cursor: 'pointer',
                    }}
                  >
                    🔑 Generate Key
                  </button>
                </div>
              )}

              {/* Keys List */}
              {loadingKeys ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
                  Loading...
                </div>
              ) : apiKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
                    No API keys yet
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    Create your first key to get started
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: spacing.sm }}>
                  {apiKeys.map((key) => (
                    <div key={key.id} style={{
                      backgroundColor: colors.background,
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      marginBottom: spacing.sm,
                      border: `1px solid ${colors.border}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.xs }}>
                            {key.name}
                          </div>
                          {key.description && (
                            <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                              {key.description}
                            </div>
                          )}
                        </div>
                        <div style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          borderRadius: '999px',
                          backgroundColor: key.is_active ? '#D1FAE5' : '#E5E7EB',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: key.is_active ? '#065F46' : '#6B7280',
                        }}>
                          {key.is_active ? 'Active' : 'Revoked'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                        <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                          Created: {formatDate(key.created_at)}
                        </div>
                        <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                          Last used: {formatDate(key.last_used_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteApiKey(key.id, key.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.error,
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Usage Instructions */}
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>📖 How to Use API Keys</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                <strong>For Home Assistant:</strong> Add the X-API-Key header:
              </p>
              <div style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                borderLeft: `4px solid ${colors.primary}`,
                marginBottom: spacing.md,
              }}>
                <pre style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: colors.textPrimary,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>
{`headers:
  X-API-Key: "pp_your_key_here"`}
                </pre>
              </div>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                <strong>For API requests:</strong> Include the header:
              </p>
              <div style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                borderLeft: `4px solid ${colors.primary}`,
              }}>
                <pre style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: colors.textPrimary,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>
{`curl http://your-ip/api/items \\
  -H "X-API-Key: pp_your_key_here"`}
                </pre>
              </div>
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
                Import items in bulk from a CSV file.
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
                Export your pantry inventory to a CSV file.
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
          <div style={{ paddingBottom: '100px' }}>
            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>📍 Default Locations</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Manage your storage locations.
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
                    backgroundColor: '#ffffff',
                    color: colors.textPrimary,
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

            <div style={{
              background: colors.card,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary }}>🏷️ Default Categories</h2>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Manage product categories.
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
                    backgroundColor: '#ffffff',
                    color: colors.textPrimary,
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
                marginBottom: '50px',
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
                <span style={{ color: colors.textPrimary, fontWeight: '600' }}>1.2.0</span>
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