import { useState, useEffect, useCallback } from 'react';
import { SystemSettings, defaultSystemSettings, SystemFeatures, BusinessSettings } from '@/types/settings';

const SETTINGS_STORAGE_KEY = 'ink-toner-moore-settings';

export interface UseSystemSettingsReturn {
  settings: SystemSettings;
  updateFeature: (path: string, enabled: boolean) => void;
  updateBusinessInfo: (updates: Partial<BusinessSettings['info']>) => void;
  updateBusinessPreferences: (updates: Partial<BusinessSettings['preferences']>) => void;
  updateInventorySettings: (updates: Partial<BusinessSettings['inventory']>) => void;
  updateReceiptSettings: (updates: Partial<BusinessSettings['receipts']>) => void;
  updateTrackingSettings: (updates: Partial<BusinessSettings['tracking']>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  isFeatureEnabled: (path: string) => boolean;
  saveSettings: () => void;
  hasChanges: boolean;
}

export function useSystemSettings(): UseSystemSettingsReturn {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    // Load from localStorage on initialization
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Merge with defaults to ensure all new settings are present
        return mergeWithDefaults(parsedSettings, defaultSystemSettings);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return defaultSystemSettings;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>(settings.lastUpdated);

  // Merge settings with defaults to handle version updates
  const mergeWithDefaults = useCallback((current: any, defaults: SystemSettings): SystemSettings => {
    const merged = JSON.parse(JSON.stringify(defaults));
    
    // Deep merge function
    const deepMerge = (target: any, source: any) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      }
    };

    deepMerge(merged, current);
    return merged;
  }, []);

  // Save to localStorage whenever settings change
  const saveSettings = useCallback(() => {
    try {
      const settingsToSave = {
        ...settings,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'user'
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
      setLastSaved(settingsToSave.lastUpdated);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  // Auto-save when settings change
  useEffect(() => {
    if (settings.lastUpdated !== lastSaved) {
      setHasChanges(true);
    }
  }, [settings, lastSaved]);

  // Update feature by path (e.g., "modules.inventory.features.stockLevels")
  const updateFeature = useCallback((path: string, enabled: boolean) => {
    setSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      const pathParts = path.split('.');
      
      let current = newSettings.features;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      current[pathParts[pathParts.length - 1]] = enabled;
      
      return {
        ...newSettings,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'user'
      };
    });
  }, []);

  // Check if a feature is enabled by path
  const isFeatureEnabled = useCallback((path: string): boolean => {
    const pathParts = path.split('.');
    let current: any = settings.features;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return current === true;
  }, [settings.features]);

  // Business info updates
  const updateBusinessInfo = useCallback((updates: Partial<BusinessSettings['info']>) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        info: {
          ...prev.business.info,
          ...updates
        }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'user'
    }));
  }, []);

  const updateBusinessPreferences = useCallback((updates: Partial<BusinessSettings['preferences']>) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        preferences: {
          ...prev.business.preferences,
          ...updates
        }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'user'
    }));
  }, []);

  const updateInventorySettings = useCallback((updates: Partial<BusinessSettings['inventory']>) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        inventory: {
          ...prev.business.inventory,
          ...updates
        }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'user'
    }));
  }, []);

  const updateReceiptSettings = useCallback((updates: Partial<BusinessSettings['receipts']>) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        receipts: {
          ...prev.business.receipts,
          ...updates
        }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'user'
    }));
  }, []);

  const updateTrackingSettings = useCallback((updates: Partial<BusinessSettings['tracking']>) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        tracking: {
          ...prev.business.tracking,
          ...updates
        }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'user'
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings({
      ...defaultSystemSettings,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'user'
    });
  }, []);

  // Export settings as JSON
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // Import settings from JSON
  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson);
      const merged = mergeWithDefaults(imported, defaultSystemSettings);
      setSettings({
        ...merged,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'import'
      });
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, [mergeWithDefaults]);

  return {
    settings,
    updateFeature,
    updateBusinessInfo,
    updateBusinessPreferences,
    updateInventorySettings,
    updateReceiptSettings,
    updateTrackingSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    isFeatureEnabled,
    saveSettings,
    hasChanges,
  };
}

// Hook to check if specific features are enabled (for conditional rendering)
export function useFeatureFlag(featurePath: string): boolean {
  const { isFeatureEnabled } = useSystemSettings();
  return isFeatureEnabled(featurePath);
}

// Hook for business settings
export function useBusinessSettings() {
  const { settings, updateBusinessInfo, updateBusinessPreferences, updateInventorySettings, updateReceiptSettings, updateTrackingSettings } = useSystemSettings();
  
  return {
    businessInfo: settings.business.info,
    preferences: settings.business.preferences,
    inventorySettings: settings.business.inventory,
    receiptSettings: settings.business.receipts,
    trackingSettings: settings.business.tracking,
    updateBusinessInfo,
    updateBusinessPreferences,
    updateInventorySettings,
    updateReceiptSettings,
    updateTrackingSettings,
  };
}