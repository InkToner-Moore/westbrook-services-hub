import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureToggle, FeatureToggleGroup, FeaturePresets } from "@/components/ui/feature-toggle";
import { FormSuccessMessage } from "@/components/ui/form-success-message";
import { 
  Wrench,
  Settings,
  Package,
  Receipt,
  Printer,
  Database,
  Globe,
  Bell,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  Users,
  BarChart3,
  FileText,
  StickyNote
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import StaffLayout from "@/components/StaffLayout";

const StaffSettings = () => {
  const { themeClasses } = useTheme();
  const {
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
    saveSettings,
    hasChanges
  } = useSystemSettings();

  const [showSuccess, setShowSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleSave = () => {
    saveSettings();
    setShowSuccess(true);
    toast({
      title: "Settings Saved",
      description: "All system settings have been updated successfully.",
    });
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleExport = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ink-toner-moore-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Settings Exported",
      description: "Settings file has been downloaded.",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importSettings(content)) {
        toast({
          title: "Settings Imported",
          description: "Settings have been successfully imported.",
        });
      } else {
        toast({
          title: "Import Failed",
          description: "Failed to import settings. Please check the file format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const applyPreset = (presetKey: keyof typeof FeaturePresets) => {
    const preset = FeaturePresets[presetKey];
    
    // First disable all features
    Object.keys(settings.features.modules).forEach(module => {
      updateFeature(`modules.${module}.enabled`, false);
    });
    
    // Then enable features from preset
    preset.features.forEach(featurePath => {
      updateFeature(featurePath, true);
    });
    
    setActivePreset(presetKey);
    toast({
      title: "Preset Applied",
      description: `${preset.label} configuration has been applied.`,
    });
  };

  const resetSettings = () => {
    resetToDefaults();
    setActivePreset(null);
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
    });
  };

  return (
    <StaffLayout 
      title="System Settings"
      icon={Wrench}
      iconColor="from-gray-500 to-slate-600"
    >
      <div className="max-w-6xl mx-auto">
        {showSuccess && (
          <FormSuccessMessage
            message="All system settings have been saved successfully!"
            className="mb-6"
            onDismiss={() => setShowSuccess(false)}
            autoHide
          />
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`${themeClasses.button.primary} ${themeClasses.interactive.focus}`}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
            {hasChanges && <Badge variant="secondary" className="ml-2">*</Badge>}
          </Button>
          
          <Button
            onClick={handleExport}
            variant="outline"
            className={`${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
          
          <label className="cursor-pointer">
            <Button
              variant="outline"
              className={`${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import Settings
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <Button
            onClick={resetSettings}
            variant="outline"
            className={`${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        {/* Quick Setup Presets */}
        <Card className={`mb-8 ${themeClasses.card.primary}`}>
          <CardHeader>
            <CardTitle className={themeClasses.text.primary}>Quick Setup</CardTitle>
            <p className={themeClasses.text.secondary}>
              Choose a preset configuration to quickly set up your system
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(FeaturePresets).map(([key, preset]) => (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all duration-200 ${
                    activePreset === key 
                      ? themeClasses.card.accent 
                      : themeClasses.card.secondary
                  } ${themeClasses.interactive.hover}`}
                  onClick={() => applyPreset(key as keyof typeof FeaturePresets)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${themeClasses.text.primary}`}>
                        {preset.label}
                      </h3>
                      {activePreset === key && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>
                      {preset.description}
                    </p>
                    <div className="mt-2 text-xs">
                      <Badge variant="outline">
                        {preset.features.length} features
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className={`grid w-full grid-cols-5 mb-8 ${themeClasses.card.secondary}`}>
            <TabsTrigger value="modules" className={themeClasses.text.secondary}>
              <Package className="h-4 w-4 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="business" className={themeClasses.text.secondary}>
              <Globe className="h-4 w-4 mr-2" />
              Business
            </TabsTrigger>
            <TabsTrigger value="system" className={themeClasses.text.secondary}>
              <Settings className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
            <TabsTrigger value="ui" className={themeClasses.text.secondary}>
              <Eye className="h-4 w-4 mr-2" />
              Interface
            </TabsTrigger>
            <TabsTrigger value="integrations" className={themeClasses.text.secondary}>
              <Database className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid gap-6">
              {/* Package Tracking Module */}
              <FeatureToggleGroup
                title="Package Tracking"
                description="Smart package tracking with multi-courier support"
                enabled={settings.features.modules.packageTracking.enabled}
                onToggle={(enabled) => updateFeature('modules.packageTracking.enabled', enabled)}
              >
                <FeatureToggle
                  id="tracking-smart-detection"
                  label="Smart Courier Detection"
                  description="Automatically detect courier from tracking number format"
                  enabled={settings.features.modules.packageTracking.features.smartDetection}
                  onToggle={(enabled) => updateFeature('modules.packageTracking.features.smartDetection', enabled)}
                  badge={{ text: "AI", variant: "secondary" }}
                />
                <FeatureToggle
                  id="tracking-multi-courier"
                  label="Multi-Courier Support"
                  description="Support for UPS, FedEx, Purolator, and Canada Post"
                  enabled={settings.features.modules.packageTracking.features.multiCourier}
                  onToggle={(enabled) => updateFeature('modules.packageTracking.features.multiCourier', enabled)}
                />
                <FeatureToggle
                  id="tracking-history"
                  label="Tracking History"
                  description="Keep history of all tracked packages"
                  enabled={settings.features.modules.packageTracking.features.trackingHistory}
                  onToggle={(enabled) => updateFeature('modules.packageTracking.features.trackingHistory', enabled)}
                />
                <FeatureToggle
                  id="tracking-customer-access"
                  label="Customer Access"
                  description="Allow customers to track packages on public site"
                  enabled={settings.features.modules.packageTracking.features.customerAccess}
                  onToggle={(enabled) => updateFeature('modules.packageTracking.features.customerAccess', enabled)}
                />
              </FeatureToggleGroup>

              {/* Receipt Generator Module */}
              <FeatureToggleGroup
                title="Receipt Generator"
                description="Professional receipt generation and printing"
                enabled={settings.features.modules.receiptGenerator.enabled}
                onToggle={(enabled) => updateFeature('modules.receiptGenerator.enabled', enabled)}
              >
                <FeatureToggle
                  id="receipts-shipping"
                  label="Shipping Receipts"
                  description="Generate receipts for shipping services"
                  enabled={settings.features.modules.receiptGenerator.features.shippingReceipts}
                  onToggle={(enabled) => updateFeature('modules.receiptGenerator.features.shippingReceipts', enabled)}
                />
                <FeatureToggle
                  id="receipts-keys"
                  label="Key Cutting Receipts"
                  description="Generate receipts for key cutting services"
                  enabled={settings.features.modules.receiptGenerator.features.keyReceipts}
                  onToggle={(enabled) => updateFeature('modules.receiptGenerator.features.keyReceipts', enabled)}
                />
                <FeatureToggle
                  id="receipts-custom-fields"
                  label="Custom Fields"
                  description="Add custom fields to receipts"
                  enabled={settings.features.modules.receiptGenerator.features.customFields}
                  onToggle={(enabled) => updateFeature('modules.receiptGenerator.features.customFields', enabled)}
                />
                <FeatureToggle
                  id="receipts-print-preview"
                  label="Print Preview"
                  description="Preview receipts before printing"
                  enabled={settings.features.modules.receiptGenerator.features.printPreview}
                  onToggle={(enabled) => updateFeature('modules.receiptGenerator.features.printPreview', enabled)}
                />
                <FeatureToggle
                  id="receipts-duplicates"
                  label="Duplicate Receipts"
                  description="Allow generating duplicate receipts"
                  enabled={settings.features.modules.receiptGenerator.features.duplicateReceipts}
                  onToggle={(enabled) => updateFeature('modules.receiptGenerator.features.duplicateReceipts', enabled)}
                />
              </FeatureToggleGroup>

              {/* Cartridge Manager Module */}
              <FeatureToggleGroup
                title="Cartridge Manager"
                description="Track cartridge refills and customer orders"
                enabled={settings.features.modules.cartridgeManager.enabled}
                onToggle={(enabled) => updateFeature('modules.cartridgeManager.enabled', enabled)}
              >
                <FeatureToggle
                  id="cartridge-refill-tracking"
                  label="Refill Tracking"
                  description="Track cartridge refill status and progress"
                  enabled={settings.features.modules.cartridgeManager.features.refillTracking}
                  onToggle={(enabled) => updateFeature('modules.cartridgeManager.features.refillTracking', enabled)}
                />
                <FeatureToggle
                  id="cartridge-status-updates"
                  label="Status Updates"
                  description="Update and track cartridge service status"
                  enabled={settings.features.modules.cartridgeManager.features.statusUpdates}
                  onToggle={(enabled) => updateFeature('modules.cartridgeManager.features.statusUpdates', enabled)}
                />
                <FeatureToggle
                  id="cartridge-completion-history"
                  label="Completion History"
                  description="Keep history of completed cartridge services"
                  enabled={settings.features.modules.cartridgeManager.features.completionHistory}
                  onToggle={(enabled) => updateFeature('modules.cartridgeManager.features.completionHistory', enabled)}
                />
                <FeatureToggle
                  id="cartridge-bulk-operations"
                  label="Bulk Operations"
                  description="Update multiple cartridges at once"
                  enabled={settings.features.modules.cartridgeManager.features.bulkOperations}
                  onToggle={(enabled) => updateFeature('modules.cartridgeManager.features.bulkOperations', enabled)}
                />
              </FeatureToggleGroup>

              {/* Inventory Module */}
              <FeatureToggleGroup
                title="Inventory Management"
                description="Track stock levels, prices, and suppliers"
                enabled={settings.features.modules.inventory.enabled}
                onToggle={(enabled) => updateFeature('modules.inventory.enabled', enabled)}
              >
                <FeatureToggle
                  id="inventory-stock-levels"
                  label="Stock Level Tracking"
                  description="Track current stock quantities"
                  enabled={settings.features.modules.inventory.features.stockLevels}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.stockLevels', enabled)}
                />
                <FeatureToggle
                  id="inventory-low-stock-alerts"
                  label="Low Stock Alerts"
                  description="Get alerts when items are running low"
                  enabled={settings.features.modules.inventory.features.lowStockAlerts}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.lowStockAlerts', enabled)}
                  dependsOn={["Stock Level Tracking"]}
                />
                <FeatureToggle
                  id="inventory-reorder-management"
                  label="Reorder Management"
                  description="Track reorder levels and generate reorder lists"
                  enabled={settings.features.modules.inventory.features.reorderManagement}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.reorderManagement', enabled)}
                />
                <FeatureToggle
                  id="inventory-price-tracking"
                  label="Price Tracking"
                  description="Track cost and sell prices"
                  enabled={settings.features.modules.inventory.features.priceTracking}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.priceTracking', enabled)}
                />
                <FeatureToggle
                  id="inventory-supplier-info"
                  label="Supplier Information"
                  description="Track supplier details and contact info"
                  enabled={settings.features.modules.inventory.features.supplierInfo}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.supplierInfo', enabled)}
                />
                <FeatureToggle
                  id="inventory-bulk-import"
                  label="Bulk Import"
                  description="Import inventory data from CSV files"
                  enabled={settings.features.modules.inventory.features.bulkImport}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.bulkImport', enabled)}
                />
                <FeatureToggle
                  id="inventory-export-reports"
                  label="Export Reports"
                  description="Export inventory reports to CSV/PDF"
                  enabled={settings.features.modules.inventory.features.exportReports}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.exportReports', enabled)}
                />
                <FeatureToggle
                  id="inventory-categories"
                  label="Categories"
                  description="Organize inventory items by categories"
                  enabled={settings.features.modules.inventory.features.categories}
                  onToggle={(enabled) => updateFeature('modules.inventory.features.categories', enabled)}
                />
              </FeatureToggleGroup>

              {/* Notes Module */}
              <FeatureToggleGroup
                title="Notes & Reminders"
                description="Internal staff notes and reminder system"
                enabled={settings.features.modules.notes.enabled}
                onToggle={(enabled) => updateFeature('modules.notes.enabled', enabled)}
              >
                <FeatureToggle
                  id="notes-categories"
                  label="Note Categories"
                  description="Organize notes by categories (customer, inventory, etc.)"
                  enabled={settings.features.modules.notes.features.categories}
                  onToggle={(enabled) => updateFeature('modules.notes.features.categories', enabled)}
                />
                <FeatureToggle
                  id="notes-sticky-notes"
                  label="Sticky Notes"
                  description="Quick visual reminder notes on dashboard"
                  enabled={settings.features.modules.notes.features.stickyNotes}
                  onToggle={(enabled) => updateFeature('modules.notes.features.stickyNotes', enabled)}
                />
                <FeatureToggle
                  id="notes-search"
                  label="Note Search"
                  description="Search through all notes by title and content"
                  enabled={settings.features.modules.notes.features.search}
                  onToggle={(enabled) => updateFeature('modules.notes.features.search', enabled)}
                />
                <FeatureToggle
                  id="notes-undo-redo"
                  label="Undo/Redo"
                  description="Undo and redo note operations with keyboard shortcuts"
                  enabled={settings.features.modules.notes.features.undoRedo}
                  onToggle={(enabled) => updateFeature('modules.notes.features.undoRedo', enabled)}
                />
                <FeatureToggle
                  id="notes-bulk-operations"
                  label="Bulk Operations"
                  description="Delete or categorize multiple notes at once"
                  enabled={settings.features.modules.notes.features.bulkOperations}
                  onToggle={(enabled) => updateFeature('modules.notes.features.bulkOperations', enabled)}
                />
                <FeatureToggle
                  id="notes-export"
                  label="Export Notes"
                  description="Export notes to PDF or CSV format"
                  enabled={settings.features.modules.notes.features.exportNotes}
                  onToggle={(enabled) => updateFeature('modules.notes.features.exportNotes', enabled)}
                />
              </FeatureToggleGroup>

              {/* Blog Module */}
              <FeatureToggleGroup
                title="Blog & Announcements"
                description="Manage customer-facing blog posts and announcements"
                enabled={settings.features.modules.blog.enabled}
                onToggle={(enabled) => updateFeature('modules.blog.enabled', enabled)}
              >
                <FeatureToggle
                  id="blog-drafts"
                  label="Draft Posts"
                  description="Save posts as drafts before publishing"
                  enabled={settings.features.modules.blog.features.drafts}
                  onToggle={(enabled) => updateFeature('modules.blog.features.drafts', enabled)}
                />
                <FeatureToggle
                  id="blog-tags"
                  label="Post Tags"
                  description="Add tags to organize blog posts"
                  enabled={settings.features.modules.blog.features.tags}
                  onToggle={(enabled) => updateFeature('modules.blog.features.tags', enabled)}
                />
                <FeatureToggle
                  id="blog-categories"
                  label="Post Categories"
                  description="Organize posts by categories"
                  enabled={settings.features.modules.blog.features.categories}
                  onToggle={(enabled) => updateFeature('modules.blog.features.categories', enabled)}
                />
                <FeatureToggle
                  id="blog-search"
                  label="Blog Search"
                  description="Search functionality for blog posts"
                  enabled={settings.features.modules.blog.features.search}
                  onToggle={(enabled) => updateFeature('modules.blog.features.search', enabled)}
                />
                <FeatureToggle
                  id="blog-public-display"
                  label="Public Display"
                  description="Show blog posts on the public website"
                  enabled={settings.features.modules.blog.features.publicDisplay}
                  onToggle={(enabled) => updateFeature('modules.blog.features.publicDisplay', enabled)}
                />
              </FeatureToggleGroup>

              {/* Website Directory Module */}
              <FeatureToggleGroup
                title="Website Directory"
                description="Quick access to business websites and tools"
                enabled={settings.features.modules.directory.enabled}
                onToggle={(enabled) => updateFeature('modules.directory.enabled', enabled)}
              >
                <FeatureToggle
                  id="directory-categories"
                  label="Link Categories"
                  description="Organize links by categories (courier, admin, etc.)"
                  enabled={settings.features.modules.directory.features.categories}
                  onToggle={(enabled) => updateFeature('modules.directory.features.categories', enabled)}
                />
                <FeatureToggle
                  id="directory-search"
                  label="Directory Search"
                  description="Search through website links"
                  enabled={settings.features.modules.directory.features.search}
                  onToggle={(enabled) => updateFeature('modules.directory.features.search', enabled)}
                />
                <FeatureToggle
                  id="directory-custom-links"
                  label="Custom Links"
                  description="Add your own custom website links"
                  enabled={settings.features.modules.directory.features.customLinks}
                  onToggle={(enabled) => updateFeature('modules.directory.features.customLinks', enabled)}
                />
                <FeatureToggle
                  id="directory-admin-links"
                  label="Admin Links"
                  description="Include admin/business account links"
                  enabled={settings.features.modules.directory.features.adminLinks}
                  onToggle={(enabled) => updateFeature('modules.directory.features.adminLinks', enabled)}
                />
              </FeatureToggleGroup>
            </div>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <div className="grid gap-6">
              {/* Business Information */}
              <Card className={themeClasses.card.primary}>
                <CardHeader>
                  <CardTitle className={themeClasses.text.primary}>Business Information</CardTitle>
                  <p className={themeClasses.text.secondary}>
                    Basic business details displayed on receipts and public site
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={themeClasses.text.primary}>Business Name</Label>
                      <Input
                        value={settings.business.info.name}
                        onChange={(e) => updateBusinessInfo({ name: e.target.value })}
                        className={themeClasses.input}
                        placeholder="Your Business Name"
                      />
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Phone Number</Label>
                      <Input
                        value={settings.business.info.phone}
                        onChange={(e) => updateBusinessInfo({ phone: e.target.value })}
                        className={themeClasses.input}
                        placeholder="(403) 555-0123"
                      />
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Email Address</Label>
                      <Input
                        type="email"
                        value={settings.business.info.email}
                        onChange={(e) => updateBusinessInfo({ email: e.target.value })}
                        className={themeClasses.input}
                        placeholder="info@yourbusiness.com"
                      />
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Website (Optional)</Label>
                      <Input
                        value={settings.business.info.website || ''}
                        onChange={(e) => updateBusinessInfo({ website: e.target.value })}
                        className={themeClasses.input}
                        placeholder="https://yourbusiness.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={themeClasses.text.primary}>Business Address</Label>
                    <Textarea
                      value={settings.business.info.address}
                      onChange={(e) => updateBusinessInfo({ address: e.target.value })}
                      className={themeClasses.input}
                      placeholder="123 Main Street, City, Province, Postal Code"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className={themeClasses.text.primary}>Business Hours</Label>
                    <Textarea
                      value={settings.business.info.hours}
                      onChange={(e) => updateBusinessInfo({ hours: e.target.value })}
                      className={themeClasses.input}
                      placeholder="Mon-Fri: 9AM-6PM, Sat: 10AM-4PM, Sun: Closed"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Business Preferences */}
              <Card className={themeClasses.card.primary}>
                <CardHeader>
                  <CardTitle className={themeClasses.text.primary}>Business Preferences</CardTitle>
                  <p className={themeClasses.text.secondary}>
                    Configure regional and formatting preferences
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className={themeClasses.text.primary}>Timezone</Label>
                      <select 
                        value={settings.business.preferences.timezone}
                        onChange={(e) => updateBusinessPreferences({ timezone: e.target.value })}
                        className={`w-full p-2 rounded-md ${themeClasses.input}`}
                      >
                        <option value="America/Edmonton">Mountain Time (Edmonton)</option>
                        <option value="America/Toronto">Eastern Time (Toronto)</option>
                        <option value="America/Vancouver">Pacific Time (Vancouver)</option>
                        <option value="America/Winnipeg">Central Time (Winnipeg)</option>
                      </select>
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Date Format</Label>
                      <select 
                        value={settings.business.preferences.dateFormat}
                        onChange={(e) => updateBusinessPreferences({ dateFormat: e.target.value })}
                        className={`w-full p-2 rounded-md ${themeClasses.input}`}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Currency Symbol</Label>
                      <select 
                        value={settings.business.preferences.currencySymbol}
                        onChange={(e) => updateBusinessPreferences({ currencySymbol: e.target.value })}
                        className={`w-full p-2 rounded-md ${themeClasses.input}`}
                      >
                        <option value="$">$ (CAD)</option>
                        <option value="US$">US$ (USD)</option>
                        <option value="€">€ (EUR)</option>
                        <option value="£">£ (GBP)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Settings */}
              <Card className={themeClasses.card.primary}>
                <CardHeader>
                  <CardTitle className={themeClasses.text.primary}>Inventory Settings</CardTitle>
                  <p className={themeClasses.text.secondary}>
                    Configure inventory tracking and alerts
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FeatureToggle
                    id="inventory-tracking-enabled"
                    label="Enable Stock Tracking"
                    description="Track current stock levels for all inventory items"
                    enabled={settings.business.inventory.enableStockTracking}
                    onToggle={(enabled) => updateInventorySettings({ enableStockTracking: enabled })}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={themeClasses.text.primary}>Low Stock Threshold</Label>
                      <Input
                        type="number"
                        value={settings.business.inventory.lowStockThreshold}
                        onChange={(e) => updateInventorySettings({ lowStockThreshold: parseInt(e.target.value) || 0 })}
                        className={themeClasses.input}
                        placeholder="10"
                        min="0"
                      />
                      <p className={`text-xs mt-1 ${themeClasses.text.muted}`}>
                        Show alerts when stock falls below this number
                      </p>
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Default Supplier</Label>
                      <Input
                        value={settings.business.inventory.defaultSupplier}
                        onChange={(e) => updateInventorySettings({ defaultSupplier: e.target.value })}
                        className={themeClasses.input}
                        placeholder="Supplier name"
                      />
                    </div>
                  </div>

                  <FeatureToggle
                    id="reorder-alerts-enabled"
                    label="Enable Reorder Alerts"
                    description="Get notified when items need to be reordered"
                    enabled={settings.business.inventory.enableReorderAlerts}
                    onToggle={(enabled) => updateInventorySettings({ enableReorderAlerts: enabled })}
                    disabled={!settings.business.inventory.enableStockTracking}
                  />

                  <FeatureToggle
                    id="price-tracking-enabled"
                    label="Enable Price Tracking"
                    description="Track cost and sell prices for inventory items"
                    enabled={settings.business.inventory.enablePriceTracking}
                    onToggle={(enabled) => updateInventorySettings({ enablePriceTracking: enabled })}
                  />

                  <FeatureToggle
                    id="categories-enabled"
                    label="Enable Categories"
                    description="Organize inventory items by categories"
                    enabled={settings.business.inventory.enableCategories}
                    onToggle={(enabled) => updateInventorySettings({ enableCategories: enabled })}
                  />
                </CardContent>
              </Card>

              {/* Receipt Settings */}
              <Card className={themeClasses.card.primary}>
                <CardHeader>
                  <CardTitle className={themeClasses.text.primary}>Receipt Settings</CardTitle>
                  <p className={themeClasses.text.secondary}>
                    Configure receipt appearance and content
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={themeClasses.text.primary}>Default Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={settings.business.receipts.defaultTaxRate}
                        onChange={(e) => updateReceiptSettings({ defaultTaxRate: parseFloat(e.target.value) || 0 })}
                        className={themeClasses.input}
                        placeholder="5"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label className={themeClasses.text.primary}>Receipt Number Format</Label>
                      <Input
                        value={settings.business.receipts.receiptNumberFormat}
                        onChange={(e) => updateReceiptSettings({ receiptNumberFormat: e.target.value })}
                        className={themeClasses.input}
                        placeholder="INK-{YYYY}-{0000}"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className={themeClasses.text.primary}>Receipt Footer Text</Label>
                    <Textarea
                      value={settings.business.receipts.footerText}
                      onChange={(e) => updateReceiptSettings({ footerText: e.target.value })}
                      className={themeClasses.input}
                      placeholder="Thank you for your business!"
                      rows={2}
                    />
                  </div>

                  <FeatureToggle
                    id="receipt-duplicates-enabled"
                    label="Enable Duplicate Receipts"
                    description="Allow generating copies of existing receipts"
                    enabled={settings.business.receipts.enableDuplicates}
                    onToggle={(enabled) => updateReceiptSettings({ enableDuplicates: enabled })}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6">
              <FeatureToggleGroup
                title="Core System Features"
                description="Essential system functionality"
                enabled={true}
                onToggle={() => {}} // Core features always enabled
              >
                <FeatureToggle
                  id="system-undo-redo"
                  label="Undo/Redo System"
                  description="Keyboard shortcuts (Ctrl+Z, Ctrl+Y) and action history"
                  enabled={settings.features.system.undoRedo}
                  onToggle={(enabled) => updateFeature('system.undoRedo', enabled)}
                  badge={{ text: "Ctrl+Z", variant: "secondary" }}
                />
                <FeatureToggle
                  id="system-keyboard-shortcuts"
                  label="Keyboard Shortcuts"
                  description="Power user keyboard shortcuts throughout the system"
                  enabled={settings.features.system.keyboardShortcuts}
                  onToggle={(enabled) => updateFeature('system.keyboardShortcuts', enabled)}
                />
                <FeatureToggle
                  id="system-print-functionality"
                  label="Print Functionality"
                  description="Professional receipt and document printing"
                  enabled={settings.features.system.printFunctionality}
                  onToggle={(enabled) => updateFeature('system.printFunctionality', enabled)}
                />
                <FeatureToggle
                  id="system-data-export"
                  label="Data Export"
                  description="Export data to CSV and PDF formats"
                  enabled={settings.features.system.dataExport}
                  onToggle={(enabled) => updateFeature('system.dataExport', enabled)}
                />
                <FeatureToggle
                  id="system-bulk-operations"
                  label="Bulk Operations"
                  description="Select and modify multiple items at once"
                  enabled={settings.features.system.bulkOperations}
                  onToggle={(enabled) => updateFeature('system.bulkOperations', enabled)}
                />
                <FeatureToggle
                  id="system-advanced-search"
                  label="Advanced Search"
                  description="Multi-field search with filters and sorting"
                  enabled={settings.features.system.advancedSearch}
                  onToggle={(enabled) => updateFeature('system.advancedSearch', enabled)}
                />
                <FeatureToggle
                  id="system-data-validation"
                  label="Data Validation"
                  description="Real-time form validation with error messages"
                  enabled={settings.features.system.dataValidation}
                  onToggle={(enabled) => updateFeature('system.dataValidation', enabled)}
                />
                <FeatureToggle
                  id="system-error-reporting"
                  label="Error Reporting"
                  description="Comprehensive error boundaries and user feedback"
                  enabled={settings.features.system.errorReporting}
                  onToggle={(enabled) => updateFeature('system.errorReporting', enabled)}
                />
                <FeatureToggle
                  id="system-activity-logging"
                  label="Activity Logging"
                  description="Log user actions for audit and troubleshooting"
                  enabled={settings.features.system.activityLogging}
                  onToggle={(enabled) => updateFeature('system.activityLogging', enabled)}
                />
                <FeatureToggle
                  id="system-auto-save"
                  label="Auto-Save"
                  description="Automatically save changes as you work"
                  enabled={settings.features.system.autoSave}
                  onToggle={(enabled) => updateFeature('system.autoSave', enabled)}
                />
              </FeatureToggleGroup>

              <FeatureToggleGroup
                title="Notifications"
                description="System notifications and alerts"
                enabled={true}
                onToggle={() => {}}
              >
                <FeatureToggle
                  id="notifications-low-stock"
                  label="Low Stock Alerts"
                  description="Get notified when inventory is running low"
                  enabled={settings.features.notifications.lowStockAlerts}
                  onToggle={(enabled) => updateFeature('notifications.lowStockAlerts', enabled)}
                  dependsOn={["Inventory Module"]}
                />
                <FeatureToggle
                  id="notifications-cartridge-completion"
                  label="Cartridge Completion"
                  description="Notifications when cartridge refills are completed"
                  enabled={settings.features.notifications.cartridgeCompletion}
                  onToggle={(enabled) => updateFeature('notifications.cartridgeCompletion', enabled)}
                  dependsOn={["Cartridge Manager"]}
                />
                <FeatureToggle
                  id="notifications-system-updates"
                  label="System Updates"
                  description="Notifications about system updates and changes"
                  enabled={settings.features.notifications.systemUpdates}
                  onToggle={(enabled) => updateFeature('notifications.systemUpdates', enabled)}
                />
                <FeatureToggle
                  id="notifications-error-alerts"
                  label="Error Alerts"
                  description="Immediate notifications for system errors"
                  enabled={settings.features.notifications.errorAlerts}
                  onToggle={(enabled) => updateFeature('notifications.errorAlerts', enabled)}
                />
                <FeatureToggle
                  id="notifications-toast"
                  label="Toast Notifications"
                  description="Pop-up notifications for actions and events"
                  enabled={settings.features.notifications.toastNotifications}
                  onToggle={(enabled) => updateFeature('notifications.toastNotifications', enabled)}
                />
              </FeatureToggleGroup>

              <FeatureToggleGroup
                title="Dashboard Features"
                description="Customize the staff dashboard experience"
                enabled={true}
                onToggle={() => {}}
              >
                <FeatureToggle
                  id="dashboard-quick-actions"
                  label="Quick Actions"
                  description="Quick access buttons for common tasks"
                  enabled={settings.features.dashboard.quickActions}
                  onToggle={(enabled) => updateFeature('dashboard.quickActions', enabled)}
                />
                <FeatureToggle
                  id="dashboard-analytics"
                  label="Analytics Dashboard"
                  description="Business metrics and performance charts"
                  enabled={settings.features.dashboard.analytics}
                  onToggle={(enabled) => updateFeature('dashboard.analytics', enabled)}
                />
                <FeatureToggle
                  id="dashboard-notifications"
                  label="Dashboard Notifications"
                  description="Show notifications panel on dashboard"
                  enabled={settings.features.dashboard.notifications}
                  onToggle={(enabled) => updateFeature('dashboard.notifications', enabled)}
                />
                <FeatureToggle
                  id="dashboard-shortcuts"
                  label="Keyboard Shortcuts Panel"
                  description="Display available keyboard shortcuts"
                  enabled={settings.features.dashboard.shortcuts}
                  onToggle={(enabled) => updateFeature('dashboard.shortcuts', enabled)}
                />
              </FeatureToggleGroup>
            </div>
          </TabsContent>

          {/* UI Tab */}
          <TabsContent value="ui" className="space-y-6">
            <div className="grid gap-6">
              <FeatureToggleGroup
                title="User Interface"
                description="Customize the look and feel of the system"
                enabled={true}
                onToggle={() => {}}
              >
                <FeatureToggle
                  id="ui-dark-mode-toggle"
                  label="Dark Mode Toggle"
                  description="Allow users to switch between light and dark themes"
                  enabled={settings.features.userInterface.darkModeToggle}
                  onToggle={(enabled) => updateFeature('userInterface.darkModeToggle', enabled)}
                />
                <FeatureToggle
                  id="ui-animations"
                  label="UI Animations"
                  description="Smooth transitions and hover effects"
                  enabled={settings.features.userInterface.animations}
                  onToggle={(enabled) => updateFeature('userInterface.animations', enabled)}
                />
                <FeatureToggle
                  id="ui-tooltips"
                  label="Tooltips"
                  description="Helpful tooltips on buttons and controls"
                  enabled={settings.features.userInterface.tooltips}
                  onToggle={(enabled) => updateFeature('userInterface.tooltips', enabled)}
                />
                <FeatureToggle
                  id="ui-breadcrumbs"
                  label="Breadcrumbs"
                  description="Navigation breadcrumbs for easier navigation"
                  enabled={settings.features.userInterface.breadcrumbs}
                  onToggle={(enabled) => updateFeature('userInterface.breadcrumbs', enabled)}
                />
                <FeatureToggle
                  id="ui-progress-indicators"
                  label="Progress Indicators"
                  description="Loading spinners and progress bars"
                  enabled={settings.features.userInterface.progressIndicators}
                  onToggle={(enabled) => updateFeature('userInterface.progressIndicators', enabled)}
                />
              </FeatureToggleGroup>

              <FeatureToggleGroup
                title="Public Website Features"
                description="Features available on the customer-facing website"
                enabled={true}
                onToggle={() => {}}
              >
                <FeatureToggle
                  id="public-package-tracking"
                  label="Public Package Tracking"
                  description="Allow customers to track packages on your website"
                  enabled={settings.features.publicSite.packageTracking}
                  onToggle={(enabled) => updateFeature('publicSite.packageTracking', enabled)}
                  dependsOn={["Package Tracking Module"]}
                />
                <FeatureToggle
                  id="public-service-info"
                  label="Service Information"
                  description="Display your services and pricing information"
                  enabled={settings.features.publicSite.serviceInformation}
                  onToggle={(enabled) => updateFeature('publicSite.serviceInformation', enabled)}
                />
                <FeatureToggle
                  id="public-business-hours"
                  label="Business Hours Display"
                  description="Show current business hours and holiday schedules"
                  enabled={settings.features.publicSite.businessHours}
                  onToggle={(enabled) => updateFeature('publicSite.businessHours', enabled)}
                />
                <FeatureToggle
                  id="public-blog"
                  label="Public Blog"
                  description="Display blog posts and announcements to customers"
                  enabled={settings.features.publicSite.blog}
                  onToggle={(enabled) => updateFeature('publicSite.blog', enabled)}
                  dependsOn={["Blog Module"]}
                />
                <FeatureToggle
                  id="public-announcements"
                  label="Announcements"
                  description="Show important announcements to customers"
                  enabled={settings.features.publicSite.announcements}
                  onToggle={(enabled) => updateFeature('publicSite.announcements', enabled)}
                />
                <FeatureToggle
                  id="public-theme-toggle"
                  label="Public Theme Toggle"
                  description="Allow customers to switch between light/dark mode"
                  enabled={settings.features.publicSite.themeToggle}
                  onToggle={(enabled) => updateFeature('publicSite.themeToggle', enabled)}
                />
              </FeatureToggleGroup>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid gap-6">
              <FeatureToggleGroup
                title="External Integrations"
                description="Connect with external services and APIs"
                enabled={true}
                onToggle={() => {}}
              >
                <FeatureToggle
                  id="integration-google-sheets"
                  label="Google Sheets Integration"
                  description="Sync data with Google Sheets for backup and reporting"
                  enabled={settings.features.integrations.googleSheets}
                  onToggle={(enabled) => updateFeature('integrations.googleSheets', enabled)}
                  badge={{ text: "Cloud", variant: "secondary" }}
                />
                <FeatureToggle
                  id="integration-firebase-auth"
                  label="Firebase Authentication"
                  description="Use Firebase for user authentication and security"
                  enabled={settings.features.integrations.firebaseAuth}
                  onToggle={(enabled) => updateFeature('integrations.firebaseAuth', enabled)}
                  badge={{ text: "Auth", variant: "secondary" }}
                />
              </FeatureToggleGroup>

              <Card className={themeClasses.card.primary}>
                <CardHeader>
                  <CardTitle className={themeClasses.text.primary}>Integration Status</CardTitle>
                  <p className={themeClasses.text.secondary}>
                    Current status of external service connections
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className={`font-medium ${themeClasses.text.primary}`}>Google Sheets API</p>
                          <p className={`text-sm ${themeClasses.text.muted}`}>Connected and operational</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className={`font-medium ${themeClasses.text.primary}`}>Firebase Authentication</p>
                          <p className={`text-sm ${themeClasses.text.muted}`}>Development mode enabled</p>
                        </div>
                      </div>
                      <Badge variant="outline">Dev Mode</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={themeClasses.card.primary}>
                <CardHeader>
                  <CardTitle className={themeClasses.text.primary}>Development Mode</CardTitle>
                  <p className={themeClasses.text.secondary}>
                    System is currently running in development mode with mock data
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 p-3 border border-orange-400/50 bg-orange-500/10 rounded-lg">
                    <Info className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className={`font-medium ${themeClasses.text.primary}`}>Development Features Active</p>
                      <ul className={`text-sm mt-2 space-y-1 ${themeClasses.text.secondary}`}>
                        <li>• Authentication bypass enabled</li>
                        <li>• Using mock data for Google Sheets</li>
                        <li>• All features available for testing</li>
                        <li>• No real external API calls</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Changes Footer */}
        {hasChanges && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg border shadow-lg ${themeClasses.card.accent}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className={themeClasses.text.primary}>You have unsaved changes</p>
              <Button
                onClick={handleSave}
                size="sm"
                className={themeClasses.button.primary}
              >
                Save Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default StaffSettings;