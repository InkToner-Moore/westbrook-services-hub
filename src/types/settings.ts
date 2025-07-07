// Comprehensive system settings and feature toggles

export interface SystemFeatures {
  // Core Mini-Apps (Staff Portal Modules)
  modules: {
    packageTracking: {
      enabled: boolean;
      features: {
        smartDetection: boolean;
        multiCourier: boolean;
        trackingHistory: boolean;
        customerAccess: boolean; // Allow customers to use tracking on public site
      };
    };
    receiptGenerator: {
      enabled: boolean;
      features: {
        shippingReceipts: boolean;
        keyReceipts: boolean;
        customFields: boolean;
        printPreview: boolean;
        emailReceipts: boolean;
        duplicateReceipts: boolean;
      };
    };
    cartridgeManager: {
      enabled: boolean;
      features: {
        refillTracking: boolean;
        statusUpdates: boolean;
        customerNotifications: boolean;
        completionHistory: boolean;
        bulkOperations: boolean;
      };
    };
    inventory: {
      enabled: boolean;
      features: {
        stockLevels: boolean;
        lowStockAlerts: boolean;
        reorderManagement: boolean;
        priceTracking: boolean;
        supplierInfo: boolean;
        bulkImport: boolean;
        exportReports: boolean;
        categories: boolean;
      };
    };
    notes: {
      enabled: boolean;
      features: {
        categories: boolean;
        stickyNotes: boolean;
        search: boolean;
        undoRedo: boolean;
        bulkOperations: boolean;
        exportNotes: boolean;
      };
    };
    blog: {
      enabled: boolean;
      features: {
        drafts: boolean;
        scheduling: boolean;
        tags: boolean;
        categories: boolean;
        search: boolean;
        publicDisplay: boolean; // Show blog on public site
      };
    };
    directory: {
      enabled: boolean;
      features: {
        categories: boolean;
        search: boolean;
        customLinks: boolean;
        adminLinks: boolean;
      };
    };
  };

  // Dashboard Features
  dashboard: {
    quickActions: boolean;
    recentActivity: boolean;
    analytics: boolean;
    weatherWidget: boolean;
    notifications: boolean;
    shortcuts: boolean;
  };

  // Public Site Features
  publicSite: {
    packageTracking: boolean;
    serviceInformation: boolean;
    businessHours: boolean;
    contactForm: boolean;
    blog: boolean;
    announcements: boolean;
    themeToggle: boolean;
  };

  // System-wide Features
  system: {
    undoRedo: boolean;
    keyboardShortcuts: boolean;
    printFunctionality: boolean;
    dataExport: boolean;
    bulkOperations: boolean;
    advancedSearch: boolean;
    dataValidation: boolean;
    errorReporting: boolean;
    activityLogging: boolean;
    autoSave: boolean;
  };

  // Notification Settings
  notifications: {
    lowStockAlerts: boolean;
    cartridgeCompletion: boolean;
    systemUpdates: boolean;
    errorAlerts: boolean;
    dailySummary: boolean;
    emailNotifications: boolean;
    toastNotifications: boolean;
  };

  // Data Management
  dataManagement: {
    autoBackup: boolean;
    exportSchedule: boolean;
    dataRetention: boolean;
    auditLog: boolean;
    dataValidation: boolean;
    duplicateDetection: boolean;
  };

  // UI/UX Settings
  userInterface: {
    darkModeToggle: boolean;
    compactMode: boolean;
    animations: boolean;
    soundEffects: boolean;
    tooltips: boolean;
    breadcrumbs: boolean;
    progressIndicators: boolean;
  };

  // Integration Settings
  integrations: {
    googleSheets: boolean;
    firebaseAuth: boolean;
    customAPIs: boolean;
    webhooks: boolean;
    thirdPartyServices: boolean;
  };
}

export interface BusinessSettings {
  info: {
    name: string;
    phone: string;
    email: string;
    address: string;
    hours: string;
    website?: string;
    logo?: string;
  };
  
  preferences: {
    timezone: string;
    dateFormat: string;
    currencySymbol: string;
    defaultTheme: 'light' | 'dark' | 'auto';
    language: string;
  };

  inventory: {
    enableStockTracking: boolean;
    lowStockThreshold: number;
    enableReorderAlerts: boolean;
    defaultSupplier: string;
    enablePriceTracking: boolean;
    enableCategories: boolean;
  };

  receipts: {
    includeBusinessLogo: boolean;
    includeTermsAndConditions: boolean;
    defaultTaxRate: number;
    enableDuplicates: boolean;
    receiptNumberFormat: string;
    footerText: string;
  };

  tracking: {
    enableCustomerAccess: boolean;
    retentionDays: number;
    enableNotifications: boolean;
    defaultCourier: string;
  };
}

export interface SystemSettings {
  features: SystemFeatures;
  business: BusinessSettings;
  version: string;
  lastUpdated: string;
  updatedBy: string;
}

// Default settings with everything enabled for initial setup
export const defaultSystemSettings: SystemSettings = {
  features: {
    modules: {
      packageTracking: {
        enabled: true,
        features: {
          smartDetection: true,
          multiCourier: true,
          trackingHistory: true,
          customerAccess: true,
        },
      },
      receiptGenerator: {
        enabled: true,
        features: {
          shippingReceipts: true,
          keyReceipts: true,
          customFields: true,
          printPreview: true,
          emailReceipts: false, // Requires email integration
          duplicateReceipts: true,
        },
      },
      cartridgeManager: {
        enabled: true,
        features: {
          refillTracking: true,
          statusUpdates: true,
          customerNotifications: false, // Requires notification system
          completionHistory: true,
          bulkOperations: true,
        },
      },
      inventory: {
        enabled: true,
        features: {
          stockLevels: true,
          lowStockAlerts: true,
          reorderManagement: true,
          priceTracking: true,
          supplierInfo: true,
          bulkImport: true,
          exportReports: true,
          categories: true,
        },
      },
      notes: {
        enabled: true,
        features: {
          categories: true,
          stickyNotes: true,
          search: true,
          undoRedo: true,
          bulkOperations: true,
          exportNotes: true,
        },
      },
      blog: {
        enabled: true,
        features: {
          drafts: true,
          scheduling: false, // Advanced feature
          tags: true,
          categories: true,
          search: true,
          publicDisplay: true,
        },
      },
      directory: {
        enabled: true,
        features: {
          categories: true,
          search: true,
          customLinks: true,
          adminLinks: true,
        },
      },
    },
    dashboard: {
      quickActions: true,
      recentActivity: true,
      analytics: true,
      weatherWidget: false,
      notifications: true,
      shortcuts: true,
    },
    publicSite: {
      packageTracking: true,
      serviceInformation: true,
      businessHours: true,
      contactForm: false, // Requires backend
      blog: true,
      announcements: true,
      themeToggle: true,
    },
    system: {
      undoRedo: true,
      keyboardShortcuts: true,
      printFunctionality: true,
      dataExport: true,
      bulkOperations: true,
      advancedSearch: true,
      dataValidation: true,
      errorReporting: true,
      activityLogging: true,
      autoSave: true,
    },
    notifications: {
      lowStockAlerts: true,
      cartridgeCompletion: true,
      systemUpdates: true,
      errorAlerts: true,
      dailySummary: false,
      emailNotifications: false,
      toastNotifications: true,
    },
    dataManagement: {
      autoBackup: false, // Requires backend
      exportSchedule: false,
      dataRetention: false,
      auditLog: true,
      dataValidation: true,
      duplicateDetection: true,
    },
    userInterface: {
      darkModeToggle: true,
      compactMode: false,
      animations: true,
      soundEffects: false,
      tooltips: true,
      breadcrumbs: true,
      progressIndicators: true,
    },
    integrations: {
      googleSheets: true,
      firebaseAuth: true,
      customAPIs: false,
      webhooks: false,
      thirdPartyServices: false,
    },
  },
  business: {
    info: {
      name: 'Ink, Toner, & Moore',
      phone: '(403) 686-2835',
      email: 'info@inktonermoore.com',
      address: 'Westbrook Mall, Calgary, AB',
      hours: 'Mon-Fri: 10AM-9PM, Sat: 10AM-6PM, Sun: 11AM-5PM',
    },
    preferences: {
      timezone: 'America/Edmonton',
      dateFormat: 'MM/DD/YYYY',
      currencySymbol: '$',
      defaultTheme: 'dark',
      language: 'en',
    },
    inventory: {
      enableStockTracking: true,
      lowStockThreshold: 10,
      enableReorderAlerts: true,
      defaultSupplier: '',
      enablePriceTracking: true,
      enableCategories: true,
    },
    receipts: {
      includeBusinessLogo: false,
      includeTermsAndConditions: false,
      defaultTaxRate: 5, // GST
      enableDuplicates: true,
      receiptNumberFormat: 'INK-{YYYY}-{0000}',
      footerText: 'Thank you for your business!',
    },
    tracking: {
      enableCustomerAccess: true,
      retentionDays: 90,
      enableNotifications: false,
      defaultCourier: '',
    },
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',
};