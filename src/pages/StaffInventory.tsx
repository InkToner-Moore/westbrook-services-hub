import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Search,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Key,
  Printer,
  Filter
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import StaffLayout from "@/components/StaffLayout";

interface InventoryItem {
  id: string;
  category: "cartridge" | "key";
  brand: string;
  model: string;
  type?: string; // For cartridges: "Black", "Color", etc.
  stockQuantity: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  supplier: string;
  lastUpdated: string;
  notes?: string;
}

const StaffInventory = () => {
  const { themeClasses } = useTheme();
  const { isFeatureEnabled } = useSystemSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // If inventory module is disabled, show disabled state
  if (!isFeatureEnabled('modules.inventory.enabled')) {
    return (
      <StaffLayout 
        title="Inventory Management"
        icon={BarChart3}
        iconColor="from-orange-400 to-red-600"
      >
        <div className="text-center py-16">
          <BarChart3 className={`h-24 w-24 mx-auto mb-6 opacity-30 ${themeClasses.text.muted}`} />
          <h2 className={`text-2xl font-bold mb-4 ${themeClasses.text.primary}`}>
            Inventory Module Disabled
          </h2>
          <p className={`text-lg mb-6 ${themeClasses.text.secondary}`}>
            The inventory management module is currently disabled in system settings.
          </p>
          <p className={`${themeClasses.text.muted}`}>
            Contact your administrator to enable this feature.
          </p>
        </div>
      </StaffLayout>
    );
  }
  
  const newItemForm = useForm<Omit<InventoryItem, 'id' | 'lastUpdated'>>();
  const editForm = useForm<InventoryItem>();

  // Mock data for development - in production this would come from Google Sheets
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: "INV-001",
      category: "cartridge",
      brand: "HP",
      model: "HP 564XL",
      type: "Black",
      stockQuantity: 15,
      reorderLevel: 5,
      costPrice: 18.99,
      sellPrice: 35.99,
      supplier: "Cartridge World",
      lastUpdated: "2024-01-15",
      notes: "Popular item"
    },
    {
      id: "INV-002",
      category: "cartridge",
      brand: "Canon",
      model: "Canon PG-245",
      type: "Black",
      stockQuantity: 3,
      reorderLevel: 5,
      costPrice: 22.50,
      sellPrice: 39.99,
      supplier: "InkJet Supplies",
      lastUpdated: "2024-01-16",
      notes: "Low stock - reorder soon"
    },
    {
      id: "INV-003",
      category: "key",
      brand: "Kwikset",
      model: "House Key",
      stockQuantity: 50,
      reorderLevel: 10,
      costPrice: 1.25,
      sellPrice: 4.99,
      supplier: "Key Supply Co",
      lastUpdated: "2024-01-17"
    },
    {
      id: "INV-004",
      category: "key",
      brand: "Yale",
      model: "Mailbox Key",
      stockQuantity: 8,
      reorderLevel: 15,
      costPrice: 2.10,
      sellPrice: 6.99,
      supplier: "Key Supply Co",
      lastUpdated: "2024-01-17",
      notes: "Check compatibility with new mailboxes"
    },
    {
      id: "INV-005",
      category: "cartridge",
      brand: "Epson",
      model: "Epson 252",
      type: "Cyan",
      stockQuantity: 0,
      reorderLevel: 3,
      costPrice: 25.00,
      sellPrice: 42.99,
      supplier: "Epson Direct",
      lastUpdated: "2024-01-18",
      notes: "Out of stock - urgent reorder"
    }
  ]);


  const getStockStatus = (item: InventoryItem) => {
    if (item.stockQuantity === 0) return { status: "out_of_stock", color: "bg-red-500/20 text-red-300 border-red-400/50" };
    if (item.stockQuantity <= item.reorderLevel) return { status: "low_stock", color: "bg-yellow-500/20 text-yellow-300 border-yellow-400/50" };
    return { status: "in_stock", color: "bg-green-500/20 text-green-300 border-green-400/50" };
  };

  const getStockIcon = (status: string) => {
    switch (status) {
      case "out_of_stock": return <AlertTriangle className="h-4 w-4" />;
      case "low_stock": return <TrendingDown className="h-4 w-4" />;
      case "in_stock": return <TrendingUp className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const addNewItem = (data: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const newItem: InventoryItem = {
      ...data,
      id: `INV-${String(inventory.length + 1).padStart(3, '0')}`,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    setInventory(prevInventory => [...prevInventory, newItem]);
    newItemForm.reset();
    
    toast({
      title: "Item Added",
      description: `${newItem.brand} ${newItem.model} has been added to inventory`,
    });
  };

  const updateItem = (data: InventoryItem) => {
    setInventory(prevInventory => 
      prevInventory.map(item => 
        item.id === data.id ? { ...data, lastUpdated: new Date().toISOString().split('T')[0] } : item
      )
    );
    setEditingItem(null);
    
    toast({
      title: "Item Updated",
      description: `${data.brand} ${data.model} has been updated`,
    });
  };

  const deleteItem = (itemId: string) => {
    setInventory(prevInventory => prevInventory.filter(item => item.id !== itemId));
    toast({
      title: "Item Deleted",
      description: `Item ${itemId} has been removed from inventory`,
    });
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    const stockStatus = getStockStatus(item).status;
    const matchesStock = stockFilter === "all" || stockFilter === stockStatus;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockItems = inventory.filter(item => item.stockQuantity <= item.reorderLevel && item.stockQuantity > 0);
  const outOfStockItems = inventory.filter(item => item.stockQuantity === 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.stockQuantity * item.costPrice), 0);
  const totalRetailValue = inventory.reduce((sum, item) => sum + (item.stockQuantity * item.sellPrice), 0);


  return (
    <StaffLayout
      title="Inventory Management"
      icon={BarChart3}
      iconColor="from-orange-400 to-red-600"
    >
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${themeClasses.text.primary}`}>
            Inventory & Stock Management
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${themeClasses.text.muted}`}>
            Track stock levels, pricing, and manage reorder alerts
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className={`backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-indigo-600/30 border shadow-2xl transition-all duration-500 ${themeClasses.button.border}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Total Items</p>
                  <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>{inventory.length}</p>
                </div>
                <Package className={`h-8 w-8 transition-all duration-500 ${themeClasses.text.secondary}`} />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.secondary} border-yellow-500/30`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Low Stock</p>
                  <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>{lowStockItems.length}</p>
                </div>
                <TrendingDown className={`h-8 w-8 text-yellow-500 transition-all duration-500`} />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.secondary} border-red-500/30`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Out of Stock</p>
                  <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>{outOfStockItems.length}</p>
                </div>
                <AlertTriangle className={`h-8 w-8 text-red-500 transition-all duration-500`} />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.secondary} border-green-500/30`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Total Value</p>
                  <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>${totalValue.toFixed(2)}</p>
                </div>
                <DollarSign className={`h-8 w-8 text-green-500 transition-all duration-500`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/20 backdrop-blur-sm">
            <TabsTrigger 
              value="inventory" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Inventory List</span>
            </TabsTrigger>
            <TabsTrigger 
              value="add" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Item</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            {/* Search and Filter */}
            <div className="mb-6 flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                <Input
                  placeholder="Search by brand, model, supplier, or item ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                />
              </div>
              <div className="flex gap-4">
                {isFeatureEnabled('modules.inventory.features.categories') && (
                  <div className="relative">
                    <Filter className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="pl-10 w-48 bg-white/10 border-white/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="cartridge">Cartridges</SelectItem>
                        <SelectItem value="key">Keys</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/30 text-white">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Inventory Table */}
            <Card className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/10 border-b border-white/20">
                      <tr>
                        <th className="text-left p-4 text-white font-semibold">Item</th>
                        <th className="text-left p-4 text-white font-semibold">Stock</th>
                        <th className="text-left p-4 text-white font-semibold">Pricing</th>
                        <th className="text-left p-4 text-white font-semibold">Supplier</th>
                        <th className="text-left p-4 text-white font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => {
                        const stockStatus = getStockStatus(item);
                        return (
                          <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-xl ${item.category === 'cartridge' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                                  {item.category === 'cartridge' ? 
                                    <Printer className="h-5 w-5 text-white" /> : 
                                    <Key className="h-5 w-5 text-white" />
                                  }
                                </div>
                                <div>
                                  <p className="text-white font-medium">{item.brand} {item.model}</p>
                                  {item.type && <p className="text-blue-200 text-sm">{item.type}</p>}
                                  <p className="text-gray-400 text-xs font-mono">{item.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Badge className={`${stockStatus.color} border flex items-center space-x-1`}>
                                  {getStockIcon(stockStatus.status)}
                                  <span>{item.stockQuantity}</span>
                                </Badge>
                                <span className="text-blue-200 text-sm">/ {item.reorderLevel}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                <p className="text-green-300">Sell: ${item.sellPrice.toFixed(2)}</p>
                                <p className="text-blue-200">Cost: ${item.costPrice.toFixed(2)}</p>
                                <p className="text-yellow-300">Margin: {(((item.sellPrice - item.costPrice) / item.sellPrice) * 100).toFixed(1)}%</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-white">{item.supplier}</p>
                              <p className="text-blue-200 text-sm">Updated: {item.lastUpdated}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItem(editingItem === item.id ? null : item.id);
                                    editForm.reset(item);
                                  }}
                                  className="text-blue-200 hover:text-white hover:bg-blue-500/20"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteItem(item.id)}
                                  className="text-red-300 hover:text-white hover:bg-red-500/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {filteredInventory.length === 0 && (
                  <div className="p-12 text-center">
                    <BarChart3 className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Items Found</h3>
                    <p className="text-blue-200">
                      {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'Start by adding items to your inventory'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Add New Inventory Item</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={newItemForm.handleSubmit(addNewItem)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white font-medium">Category</Label>
                      <Select onValueChange={(value) => newItemForm.setValue('category', value as "cartridge" | "key")}>
                        <SelectTrigger className="bg-white/10 border-white/30 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cartridge">Cartridge</SelectItem>
                          <SelectItem value="key">Key</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Brand</Label>
                      <Input
                        {...newItemForm.register('brand', { required: true })}
                        placeholder="e.g. HP, Canon, Kwikset"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Model</Label>
                      <Input
                        {...newItemForm.register('model', { required: true })}
                        placeholder="e.g. HP 564XL, House Key"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Type (Optional)</Label>
                      <Input
                        {...newItemForm.register('type')}
                        placeholder="e.g. Black, Color, Cyan"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Stock Quantity</Label>
                      <Input
                        {...newItemForm.register('stockQuantity', { required: true, valueAsNumber: true })}
                        type="number"
                        min="0"
                        placeholder="0"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Reorder Level</Label>
                      <Input
                        {...newItemForm.register('reorderLevel', { required: true, valueAsNumber: true })}
                        type="number"
                        min="0"
                        placeholder="5"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Cost Price ($)</Label>
                      <Input
                        {...newItemForm.register('costPrice', { required: true, valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Sell Price ($)</Label>
                      <Input
                        {...newItemForm.register('sellPrice', { required: true, valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-white font-medium">Supplier</Label>
                    <Input
                      {...newItemForm.register('supplier', { required: true })}
                      placeholder="e.g. Cartridge World, Key Supply Co"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white font-medium">Notes (Optional)</Label>
                    <Input
                      {...newItemForm.register('notes')}
                      placeholder="Any additional notes"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Inventory
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </StaffLayout>
  );
};

export default StaffInventory;