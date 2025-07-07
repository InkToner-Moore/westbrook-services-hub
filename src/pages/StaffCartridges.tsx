import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Printer, 
  User, 
  LogOut, 
  Search,
  Plus,
  Trash2,
  Edit,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";

interface CartridgeOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  cartridgeModel: string;
  cartridgeBrand: string;
  cartridgeType: string; // "Black", "Color", "Cyan", etc.
  status: "received" | "in_progress" | "ready" | "completed";
  dateReceived: string;
  dateCompleted?: string;
  estimatedCompletion?: string;
  notes: string;
  price?: number;
}

const StaffCartridges = () => {
  const { user, logout } = useAuth();
  const { themeClasses } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  
  const newOrderForm = useForm<Omit<CartridgeOrder, 'id' | 'dateReceived'>>();

  // Mock data for development - in production this would come from Google Sheets
  const [orders, setOrders] = useState<CartridgeOrder[]>([
    {
      id: "ORD-001",
      customerName: "John Smith",
      customerPhone: "(403) 555-0123",
      customerEmail: "john@email.com",
      cartridgeModel: "HP 564XL",
      cartridgeBrand: "HP",
      cartridgeType: "Black",
      status: "ready",
      dateReceived: "2024-01-15",
      estimatedCompletion: "2024-01-16",
      notes: "Customer prefers pickup calls",
      price: 25.99
    },
    {
      id: "ORD-002",
      customerName: "Sarah Johnson",
      customerPhone: "(403) 555-0456",
      cartridgeModel: "Canon PG-245",
      cartridgeBrand: "Canon",
      cartridgeType: "Black",
      status: "in_progress",
      dateReceived: "2024-01-16",
      estimatedCompletion: "2024-01-17",
      notes: "Rush order",
      price: 30.00
    },
    {
      id: "ORD-003",
      customerName: "Mike Wilson",
      customerPhone: "(403) 555-0789",
      cartridgeModel: "Epson 252",
      cartridgeBrand: "Epson",
      cartridgeType: "Cyan",
      status: "received",
      dateReceived: "2024-01-17",
      notes: "Check compatibility first",
      price: 28.50
    }
  ]);

  const handleLogout = async () => {
    await logout();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received": return "bg-blue-500/20 text-blue-300 border-blue-400/50";
      case "in_progress": return "bg-yellow-500/20 text-yellow-300 border-yellow-400/50";
      case "ready": return "bg-green-500/20 text-green-300 border-green-400/50";
      case "completed": return "bg-gray-500/20 text-gray-300 border-gray-400/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-400/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received": return <AlertCircle className="h-4 w-4" />;
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: CartridgeOrder['status']) => {
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedOrder = { ...order, status: newStatus };
          if (newStatus === 'completed') {
            updatedOrder.dateCompleted = new Date().toISOString().split('T')[0];
          }
          return updatedOrder;
        }
        return order;
      })
    );
    
    toast({
      title: "Status Updated",
      description: `Order ${orderId} status changed to ${newStatus.replace('_', ' ')}`,
    });
  };

  const addNewOrder = (data: Omit<CartridgeOrder, 'id' | 'dateReceived'>) => {
    const newOrder: CartridgeOrder = {
      ...data,
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      dateReceived: new Date().toISOString().split('T')[0],
      status: 'received'
    };
    
    setOrders(prevOrders => [...prevOrders, newOrder]);
    newOrderForm.reset();
    
    toast({
      title: "Order Added",
      description: `New cartridge order ${newOrder.id} has been created`,
    });
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    toast({
      title: "Order Deleted",
      description: `Order ${orderId} has been removed`,
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerPhone.includes(searchTerm) ||
                         order.cartridgeModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse transition-all duration-300 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000 transition-all duration-300 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500 transition-all duration-300 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 shadow-2xl transition-colors duration-300 ${themeClasses.header}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link 
                to="/staff/dashboard"
                className={`transition-colors mr-4 group ${themeClasses.link}`}
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-purple-400 to-indigo-600 p-3 rounded-xl shadow-2xl">
                <Printer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-300 ${themeClasses.gradient.title}`}>
                  Customer Cartridge Manager
                </h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${themeClasses.text.secondary}`}>Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isDev && bypassAuth && (
                <div className="text-xs px-2 py-1 bg-orange-500/20 border border-orange-400/50 rounded text-orange-200">
                  DEV MODE
                </div>
              )}
              <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className={`rounded-full px-4 py-2 transition-all duration-300 hover:scale-110 ${themeClasses.button.ghost}`}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
            Cartridge Refill Management
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
            Track customer cartridge refills from received to completion
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Order Form */}
          <div className="lg:col-span-1">
            <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                  <Plus className="h-5 w-5" />
                  <span>New Cartridge Order</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={newOrderForm.handleSubmit(addNewOrder)} className="space-y-4">
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name</Label>
                    <Input
                      {...newOrderForm.register('customerName', { required: true })}
                      placeholder="Enter customer name"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Phone Number</Label>
                    <Input
                      {...newOrderForm.register('customerPhone', { required: true })}
                      placeholder="(403) 555-0123"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Email (Optional)</Label>
                    <Input
                      {...newOrderForm.register('customerEmail')}
                      type="email"
                      placeholder="customer@email.com"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Cartridge Brand</Label>
                    <Select onValueChange={(value) => newOrderForm.setValue('cartridgeBrand', value)}>
                      <SelectTrigger className={`transition-all duration-300 ${themeClasses.input}`}>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HP">HP</SelectItem>
                        <SelectItem value="Canon">Canon</SelectItem>
                        <SelectItem value="Epson">Epson</SelectItem>
                        <SelectItem value="Brother">Brother</SelectItem>
                        <SelectItem value="Lexmark">Lexmark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Cartridge Model</Label>
                    <Input
                      {...newOrderForm.register('cartridgeModel', { required: true })}
                      placeholder="e.g. HP 564XL, Canon PG-245"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Cartridge Type</Label>
                    <Select onValueChange={(value) => newOrderForm.setValue('cartridgeType', value)}>
                      <SelectTrigger className={`transition-all duration-300 ${themeClasses.input}`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Black">Black</SelectItem>
                        <SelectItem value="Color">Color (Tri-color)</SelectItem>
                        <SelectItem value="Cyan">Cyan</SelectItem>
                        <SelectItem value="Magenta">Magenta</SelectItem>
                        <SelectItem value="Yellow">Yellow</SelectItem>
                        <SelectItem value="Photo Black">Photo Black</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Estimated Completion</Label>
                    <Input
                      {...newOrderForm.register('estimatedCompletion')}
                      type="date"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Price ($)</Label>
                    <Input
                      {...newOrderForm.register('price', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="25.99"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Notes</Label>
                    <Textarea
                      {...newOrderForm.register('notes')}
                      placeholder="Any special notes or instructions"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                      rows={3}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className={`w-full font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Order
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Orders List */}
          <div className="lg:col-span-2">
            {/* Search and Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                <Input
                  placeholder="Search by customer name, phone, model, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 transition-all duration-300 ${themeClasses.input}`}
                />
              </div>
              <div className="relative">
                <Filter className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={`pl-10 w-48 transition-all duration-300 ${themeClasses.input}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orders Grid */}
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className={`shadow-2xl hover:shadow-3xl transition-all duration-300 ${themeClasses.card.primary}`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className={`text-lg font-bold transition-colors duration-300 ${themeClasses.text.primary}`}>{order.customerName}</h3>
                          <Badge className={`${getStatusColor(order.status)} border flex items-center space-x-1`}>
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <p className={`text-sm font-mono transition-colors duration-300 ${themeClasses.text.secondary}`}>{order.id}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOrder(editingOrder === order.id ? null : order.id)}
                          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOrder(order.id)}
                          className={`transition-all duration-300 ${themeClasses.button.danger}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{order.customerPhone}</span>
                      </div>
                      {order.customerEmail && (
                        <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{order.customerEmail}</span>
                        </div>
                      )}
                      <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Received: {order.dateReceived}</span>
                      </div>
                    </div>

                    <div className={`rounded-xl p-4 mb-4 transition-all duration-300 ${themeClasses.card.secondary}`}>
                      <h4 className={`font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>Cartridge Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <span className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Brand: <span className={`transition-colors duration-300 ${themeClasses.text.primary}`}>{order.cartridgeBrand}</span></span>
                        <span className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Model: <span className={`transition-colors duration-300 ${themeClasses.text.primary}`}>{order.cartridgeModel}</span></span>
                        <span className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Type: <span className={`transition-colors duration-300 ${themeClasses.text.primary}`}>{order.cartridgeType}</span></span>
                        {order.price && (
                          <span className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Price: <span className={`transition-colors duration-300 ${themeClasses.text.primary}`}>${order.price.toFixed(2)}</span></span>
                        )}
                        {order.estimatedCompletion && (
                          <span className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Est. Complete: <span className={`transition-colors duration-300 ${themeClasses.text.primary}`}>{order.estimatedCompletion}</span></span>
                        )}
                      </div>
                    </div>

                    {order.notes && (
                      <div className={`rounded-xl p-3 mb-4 transition-all duration-300 ${themeClasses.status.info}`}>
                        <p className="text-sm">{order.notes}</p>
                      </div>
                    )}

                    {/* Status Update Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {order.status !== 'received' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateOrderStatus(order.id, 'received')}
                          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                        >
                          Mark as Received
                        </Button>
                      )}
                      {order.status !== 'in_progress' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateOrderStatus(order.id, 'in_progress')}
                          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                        >
                          Mark in Progress
                        </Button>
                      )}
                      {order.status !== 'ready' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                        >
                          Mark Ready
                        </Button>
                      )}
                      {order.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredOrders.length === 0 && (
                <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
                  <CardContent className="p-12 text-center">
                    <Printer className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No Orders Found</h3>
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filter criteria'
                        : 'Start by adding a new cartridge order'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffCartridges;