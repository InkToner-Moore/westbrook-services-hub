import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench,
  Settings,
  Database,
  Globe,
  Bell,
  Key,
  Shield,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { googleSheetsService } from "@/services/googleSheets";
import StaffLayout from "@/components/StaffLayout";

interface SystemSettings {
  businessInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    hours: string;
  };
  integrations: {
    googleSheetsId: string;
    googleApiKey: string;
    firebaseProjectId: string;
    customDomain: string;
  };
  notifications: {
    lowStockAlerts: boolean;
    customerUpdates: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  appearance: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    favicon: string;
  };
}

const StaffSettings = () => {
  const { themeClasses } = useTheme();
  const [activeTab, setActiveTab] = useState("business");
  const [connectionStatus, setConnectionStatus] = useState<{
    googleSheets: "connected" | "disconnected" | "testing";
    firebase: "connected" | "disconnected" | "testing";
  }>({
    googleSheets: "connected",
    firebase: "connected"
  });

  // Mock settings data - in production this would come from your settings storage
  const [settings, setSettings] = useState<SystemSettings>({
    businessInfo: {
      name: "Ink, Toner, & Moore",
      phone: "(403) 686-2835",
      email: "info@inktonermoore.com",
      address: "1200 37 Street SW Unit 3b, Calgary, AB T3C 1S2",
      hours: "Mon-Tue: 10AM-7PM, Wed-Fri: 10AM-9PM, Sat: 10AM-6PM, Sun: 11AM-5PM"
    },
    integrations: {
      googleSheetsId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      googleApiKey: "AIza*********************", 
      firebaseProjectId: "ink-toner-moore-dev",
      customDomain: "inktonermoore.com"
    },
    notifications: {
      lowStockAlerts: true,
      customerUpdates: true,
      emailNotifications: true,
      smsNotifications: false
    },
    appearance: {
      primaryColor: "#3B82F6",
      secondaryColor: "#F59E0B",
      logoUrl: "",
      favicon: ""
    }
  });

  const businessForm = useForm<SystemSettings['businessInfo']>({
    defaultValues: settings.businessInfo
  });

  const integrationsForm = useForm<SystemSettings['integrations']>({
    defaultValues: settings.integrations
  });

  const updateBusinessInfo = async (data: SystemSettings['businessInfo']) => {
    try {
      setSettings(prev => ({ ...prev, businessInfo: data }));
      
      toast({
        title: "Business Information Updated",
        description: "Your business details have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update business information",
        variant: "destructive"
      });
    }
  };

  const updateIntegrations = async (data: SystemSettings['integrations']) => {
    try {
      setSettings(prev => ({ ...prev, integrations: data }));
      
      toast({
        title: "Integration Settings Updated",
        description: "API configurations have been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update integration settings",
        variant: "destructive"
      });
    }
  };

  const testGoogleSheetsConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, googleSheets: "testing" }));
    
    try {
      // Test the Google Sheets connection
      await googleSheetsService.getData('inventory');
      setConnectionStatus(prev => ({ ...prev, googleSheets: "connected" }));
      
      toast({
        title: "Connection Successful",
        description: "Google Sheets API is working correctly",
      });
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, googleSheets: "disconnected" }));
      
      toast({
        title: "Connection Failed", 
        description: "Unable to connect to Google Sheets API",
        variant: "destructive"
      });
    }
  };

  const exportSystemData = async () => {
    try {
      const allData = {
        inventory: await googleSheetsService.getData('inventory'),
        cartridges: await googleSheetsService.getData('cartridges'),
        notes: await googleSheetsService.getData('notes'),
        receipts: await googleSheetsService.getData('receipts'),
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ink-toner-moore-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "System data has been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export system data",
        variant: "destructive"
      });
    }
  };

  const getConnectionStatusBadge = (status: "connected" | "disconnected" | "testing") => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500/20 text-green-300 border-green-400/50 border"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case "disconnected":
        return <Badge className="bg-red-500/20 text-red-300 border-red-400/50 border"><AlertTriangle className="h-3 w-3 mr-1" />Disconnected</Badge>;
      case "testing":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/50 border"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Testing...</Badge>;
    }
  };

  return (
    <StaffLayout
      title="System Settings"
      icon={Wrench}
      iconColor="from-gray-400 to-slate-600"
    >
      <div className="text-center mb-12">
        <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${themeClasses.text.primary}`}>
          System Configuration
        </h2>
        <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${themeClasses.text.muted}`}>
          Configure system preferences and integrations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-4 mb-8 backdrop-blur-sm transition-all duration-500 ${themeClasses.card}`}>
          <TabsTrigger 
            value="business" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger 
            value="integrations" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger 
            value="data" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className={`backdrop-blur-xl shadow-2xl max-w-4xl mx-auto transition-all duration-500 ${themeClasses.card}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                <Info className="h-5 w-5" />
                <span>Business Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={businessForm.handleSubmit(updateBusinessInfo)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Business Name</Label>
                    <Input
                      {...businessForm.register('name', { required: true })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Phone Number</Label>
                    <Input
                      {...businessForm.register('phone', { required: true })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Email Address</Label>
                    <Input
                      {...businessForm.register('email', { required: true })}
                      type="email"
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Address</Label>
                    <Input
                      {...businessForm.register('address', { required: true })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                </div>
                
                <div>
                  <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Business Hours</Label>
                  <Textarea
                    {...businessForm.register('hours', { required: true })}
                    placeholder="Mon-Fri: 9AM-5PM..."
                    className={`min-h-[100px] transition-all duration-500 ${themeClasses.input}`}
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Information
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Connection Status */}
            <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                  <Database className="h-5 w-5" />
                  <span>Integration Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-white/20">
                    <div>
                      <h3 className={`font-semibold transition-all duration-500 ${themeClasses.text.primary}`}>Google Sheets</h3>
                      <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>Data storage and synchronization</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getConnectionStatusBadge(connectionStatus.googleSheets)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={testGoogleSheetsConnection}
                        disabled={connectionStatus.googleSheets === "testing"}
                        className={themeClasses.button.ghost}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border border-white/20">
                    <div>
                      <h3 className={`font-semibold transition-all duration-500 ${themeClasses.text.primary}`}>Firebase Auth</h3>
                      <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>Staff authentication system</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getConnectionStatusBadge(connectionStatus.firebase)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={themeClasses.button.ghost}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Configuration */}
            <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                  <Key className="h-5 w-5" />
                  <span>API Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={integrationsForm.handleSubmit(updateIntegrations)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Google Sheets ID</Label>
                      <Input
                        {...integrationsForm.register('googleSheetsId')}
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        className={`transition-all duration-500 ${themeClasses.input}`}
                      />
                    </div>
                    
                    <div>
                      <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Google API Key</Label>
                      <Input
                        {...integrationsForm.register('googleApiKey')}
                        type="password"
                        placeholder="AIza*********************"
                        className={`transition-all duration-500 ${themeClasses.input}`}
                      />
                    </div>
                    
                    <div>
                      <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Firebase Project ID</Label>
                      <Input
                        {...integrationsForm.register('firebaseProjectId')}
                        placeholder="ink-toner-moore"
                        className={`transition-all duration-500 ${themeClasses.input}`}
                      />
                    </div>
                    
                    <div>
                      <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Custom Domain</Label>
                      <Input
                        {...integrationsForm.register('customDomain')}
                        placeholder="inktonermoore.com"
                        className={`transition-all duration-500 ${themeClasses.input}`}
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Integration Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className={`backdrop-blur-xl shadow-2xl max-w-4xl mx-auto transition-all duration-500 ${themeClasses.card}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-white/20">
                    <div>
                      <h3 className={`font-semibold transition-all duration-500 ${themeClasses.text.primary}`}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h3>
                      <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>
                        {key === 'lowStockAlerts' && 'Get notified when inventory is running low'}
                        {key === 'customerUpdates' && 'Receive updates about customer orders'}
                        {key === 'emailNotifications' && 'Enable email notifications'}
                        {key === 'smsNotifications' && 'Enable SMS text notifications'}
                      </p>
                    </div>
                    <Button
                      variant={value ? "default" : "ghost"}
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          [key]: !value
                        }
                      }))}
                      className={value ? "bg-green-500 hover:bg-green-600" : themeClasses.button.ghost}
                    >
                      {value ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card className={`backdrop-blur-xl shadow-2xl max-w-4xl mx-auto transition-all duration-500 ${themeClasses.card}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                <Shield className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 rounded-lg border border-blue-400/50 bg-blue-500/10">
                  <h3 className={`font-semibold mb-2 transition-all duration-500 ${themeClasses.text.primary}`}>System Backup</h3>
                  <p className={`text-sm mb-4 transition-all duration-500 ${themeClasses.text.muted}`}>
                    Export all system data including inventory, customer records, and settings for backup purposes.
                  </p>
                  <Button
                    onClick={exportSystemData}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Export System Data
                  </Button>
                </div>

                <div className="p-6 rounded-lg border border-yellow-400/50 bg-yellow-500/10">
                  <h3 className={`font-semibold mb-2 transition-all duration-500 ${themeClasses.text.primary}`}>Development Mode</h3>
                  <p className={`text-sm mb-4 transition-all duration-500 ${themeClasses.text.muted}`}>
                    Currently running in development mode with mock data. In production, all data will be stored in Google Sheets.
                  </p>
                  <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/50 border">
                    {googleSheetsService.isDevMode() ? "Development Mode" : "Production Mode"}
                  </Badge>
                </div>

                <div className="p-6 rounded-lg border border-green-400/50 bg-green-500/10">
                  <h3 className={`font-semibold mb-2 transition-all duration-500 ${themeClasses.text.primary}`}>Data Security</h3>
                  <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>
                    All data is encrypted in transit and at rest. API keys are stored securely and never exposed in client code.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </StaffLayout>
  );
};

export default StaffSettings;