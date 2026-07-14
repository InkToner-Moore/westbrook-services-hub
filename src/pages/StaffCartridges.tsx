import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Filter,
  Loader2,
  Receipt
} from "lucide-react";
import {
  GST_RATE,
  ReceiptSize,
  formatReceiptDate,
  generateSimpleReceiptPdf,
  round2,
} from "@/lib/simpleReceipt";
import {
  CartridgeLine,
  cartridgesSubtotal,
  describeCartridge,
  emptyCartridgeLine,
  isFilledNumber,
  readCartridgeLines,
  toStoredCartridge,
} from "@/lib/cartridges";
import {
  ORDER_STATUS_COLLECTION,
  OrderStatusDoc,
  lastNameOf,
} from "@/lib/orderStatus";
import CartridgeLineFields from "@/components/CartridgeLineFields";
import GstBreakdown from "@/components/GstBreakdown";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import {
  getCollection,
  setDocument,
  updateDocument,
  deleteDocument,
  generateOrderId,
} from "@/lib/firestore";

interface CartridgeOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  cartridges: CartridgeLine[];
  status: "in_progress" | "ready" | "picked_up";
  dateReceived: string;
  dateCompleted?: string;
  notes: string;
}

// Shape shared by the add, edit and receipt forms.
interface OrderFormValues {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  cartridges: CartridgeLine[];
  notes: string;
}

const ORDERS_COLLECTION = 'cartridgeOrders';
const STATUS_COLLECTION = ORDER_STATUS_COLLECTION;
const DELETED_ORDERS_COLLECTION = 'deletedOrders';

// Marks a form field as required.
const RequiredMark = () => (
  <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
);

// Renders a "Label: value" pair, falling back to a muted "Unspecified" when empty.
const DetailField = ({
  label,
  value,
  themeClasses,
}: {
  label: string;
  value?: string | number | null;
  themeClasses: any;
}) => {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'number' && !Number.isFinite(value));

  return (
    <span className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
      {label}:{' '}
      <span
        className={`transition-colors duration-300 ${
          isEmpty ? themeClasses.text.muted : themeClasses.text.primary
        }`}
      >
        {isEmpty ? 'Unspecified' : value}
      </span>
    </span>
  );
};

// ---- Cartridge refill receipt ----

// Confirm/edit dialog shown before downloading a cartridge refill receipt.
// Every cartridge needs a price here, even if the order doesn't have one yet.
const ReceiptDialog = ({
  order,
  themeClasses,
}: {
  order: CartridgeOrder;
  themeClasses: any;
}) => {
  const [open, setOpen] = useState(false);
  // GST applies to almost every sale, so it's on unless staff opt out.
  const [addGst, setAddGst] = useState(true);
  const form = useForm<OrderFormValues>();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const subtotal = cartridgesSubtotal(watch('cartridges') ?? []);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setAddGst(true);
      reset({
        customerName: order.customerName ?? '',
        customerPhone: order.customerPhone ?? '',
        customerEmail: order.customerEmail ?? '',
        cartridges: order.cartridges.map((line) => ({ ...line })),
        notes: order.notes ?? '',
      });
    }
    setOpen(next);
  };

  const download = (values: OrderFormValues, size: ReceiptSize) => {
    const items = values.cartridges.map((line) => ({
      description: describeCartridge(line),
      price: line.price as number,
    }));
    const total = cartridgesSubtotal(values.cartridges);

    generateSimpleReceiptPdf(
      {
        title: 'Cartridge Refill Receipt',
        identifierLabel: 'Order ID',
        identifierValue: order.id,
        date: formatReceiptDate(new Date().toISOString().split('T')[0]),
        rows: [
          { label: 'Name', value: values.customerName },
          { label: 'Phone Number', value: values.customerPhone },
          { label: 'Email', value: values.customerEmail },
          { label: 'Received', value: formatReceiptDate(order.dateReceived) },
          { label: 'Notes', value: values.notes },
        ],
        items,
        price: total,
        gst: addGst ? round2(total * GST_RATE) : undefined,
        fileNameBase: `cartridge-receipt-${order.id}`,
      },
      size,
    );
    setOpen(false);
  };

  const downloadAs = (size: ReceiptSize) => handleSubmit((values) => download(values, size));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
          title="Download refill receipt"
        >
          <Receipt className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cartridge Refill Receipt</DialogTitle>
          <DialogDescription>
            Confirm the details below — blank fields are left off the printed receipt.
            Every cartridge needs a price before you can download.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={downloadAs('4x6')} className="space-y-3">
          <div>
            <Label className="font-medium">Customer Name</Label>
            <Input {...register('customerName')} />
          </div>
          <div>
            <Label className="font-medium">Phone Number</Label>
            <Input {...register('customerPhone')} />
          </div>
          <div>
            <Label className="font-medium">Email</Label>
            <Input type="email" {...register('customerEmail')} />
          </div>

          <CartridgeLineFields
            form={form}
            themeClasses={themeClasses}
            requirePrice
            compact
          />
          {errors.cartridges && (
            <p className="text-sm text-red-500">Every cartridge needs a model and a valid price.</p>
          )}

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <Checkbox checked={addGst} onCheckedChange={(checked) => setAddGst(checked === true)} />
            Add GST ({(GST_RATE * 100).toFixed(0)}%)
          </label>
          {addGst && subtotal > 0 && <GstBreakdown price={subtotal} />}

          <div>
            <Label className="font-medium">Notes</Label>
            <Textarea rows={2} {...register('notes')} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={downloadAs('letter')}
            >
              Download Full Page
            </Button>
            <Button
              type="submit"
              className={`font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
            >
              Download 4×6
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Inline editor for an existing cartridge order.
const EditOrderForm = ({
  order,
  themeClasses,
  onSave,
  onCancel,
}: {
  order: CartridgeOrder;
  themeClasses: any;
  onSave: (data: OrderFormValues) => void;
  onCancel: () => void;
}) => {
  const form = useForm<OrderFormValues>({
    defaultValues: {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? '',
      cartridges: order.cartridges.map((line) => ({ ...line })),
      notes: order.notes ?? '',
    },
  });
  const { register, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name<RequiredMark /></Label>
          <Input
            {...register('customerName', { required: true })}
            className={`transition-all duration-300 ${themeClasses.input}`}
          />
        </div>
        <div>
          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Phone Number<RequiredMark /></Label>
          <Input
            {...register('customerPhone', { required: true })}
            className={`transition-all duration-300 ${themeClasses.input}`}
          />
        </div>
        <div>
          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Email (Optional)</Label>
          <Input
            type="email"
            {...register('customerEmail')}
            className={`transition-all duration-300 ${themeClasses.input}`}
          />
        </div>
      </div>

      <CartridgeLineFields form={form} themeClasses={themeClasses} />

      <div>
        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Notes</Label>
        <Textarea
          {...register('notes')}
          rows={3}
          className={`transition-all duration-300 ${themeClasses.input}`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          className={`font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
        >
          Save Changes
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

const StaffCartridges = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<CartridgeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const newOrderForm = useForm<OrderFormValues>({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      cartridges: [emptyCartridgeLine()],
      notes: '',
    },
  });

  // Load orders from Firestore on mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await getCollection<CartridgeOrder>(ORDERS_COLLECTION, 'dateReceived');
        setOrders(data.map(order => ({ ...order, cartridges: readCartridgeLines(order) })));
      } catch (error) {
        console.error('Failed to load orders:', error);
        toast({ title: "Error", description: "Failed to load orders from database" });
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const getStatusColor = (status: string) => {
    if (isDarkMode) {
      switch (status) {
        case "in_progress": return "bg-yellow-500/20 text-yellow-300 border-yellow-400/50";
        case "ready": return "bg-green-500/20 text-green-300 border-green-400/50";
        case "picked_up": return "bg-gray-500/20 text-gray-300 border-gray-400/50";
        default: return "bg-gray-500/20 text-gray-300 border-gray-400/50";
      }
    }
    switch (status) {
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-400";
      case "ready": return "bg-green-100 text-green-800 border-green-400";
      case "picked_up": return "bg-stone-200 text-stone-700 border-stone-400";
      default: return "bg-stone-200 text-stone-700 border-stone-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "picked_up": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Sync minimal order status to the public-facing orderStatus collection.
  // The last name goes along for the ride so customers can look their refill up
  // without having to keep hold of the order ID.
  const syncOrderStatus = async (order: CartridgeOrder, status: string) => {
    const mirror: OrderStatusDoc = {
      orderId: order.id,
      customerPhone: order.customerPhone,
      customerLastName: lastNameOf(order.customerName),
      status,
    };

    try {
      await setDocument(STATUS_COLLECTION, order.id, mirror);
    } catch (error) {
      console.error('Failed to sync order status:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: CartridgeOrder['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updates: Record<string, any> = { status: newStatus };
    if (newStatus === 'picked_up') {
      updates.dateCompleted = new Date().toISOString().split('T')[0];
    }

    try {
      await updateDocument(ORDERS_COLLECTION, orderId, updates);
      await syncOrderStatus(order, newStatus);

      setOrders(prevOrders =>
        prevOrders.map(o => {
          if (o.id === orderId) {
            return { ...o, ...updates };
          }
          return o;
        })
      );

      toast({
        title: "Status Updated",
        description: `Order ${orderId} status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast({ title: "Error", description: "Failed to update order status" });
    }
  };

  const addNewOrder = async (data: OrderFormValues) => {
    const orderId = generateOrderId();
    const newOrder: CartridgeOrder = {
      id: orderId,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: (data.customerEmail ?? '').trim(),
      cartridges: data.cartridges.map(toStoredCartridge),
      notes: data.notes ?? '',
      dateReceived: new Date().toISOString().split('T')[0],
      status: 'in_progress',
    };

    try {
      await setDocument(ORDERS_COLLECTION, orderId, newOrder);
      await syncOrderStatus(newOrder, 'in_progress');

      setOrders(prevOrders => [newOrder, ...prevOrders]);
      newOrderForm.reset({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        cartridges: [emptyCartridgeLine()],
        notes: '',
      });

      toast({
        title: "Order Added",
        description: `New cartridge order ${orderId} has been created`,
      });
    } catch (error) {
      console.error('Failed to add order:', error);
      toast({ title: "Error", description: "Failed to save order to database" });
    }
  };

  const saveOrderEdits = async (orderId: string, data: OrderFormValues) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Written with setDocument rather than a partial update so orders created
    // before multi-cartridge support drop their old inline cartridge fields.
    const updatedOrder: CartridgeOrder = {
      ...order,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: (data.customerEmail ?? '').trim(),
      cartridges: data.cartridges.map(toStoredCartridge),
      notes: data.notes ?? '',
    };

    try {
      await setDocument(ORDERS_COLLECTION, orderId, updatedOrder);
      // Re-synced unconditionally: an edit can change the name or phone the
      // public mirror is keyed on.
      await syncOrderStatus(updatedOrder, order.status);

      setOrders(prevOrders => prevOrders.map(o => (o.id === orderId ? updatedOrder : o)));
      setEditingOrder(null);

      toast({
        title: "Order Updated",
        description: `Order ${orderId} has been updated`,
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      toast({ title: "Error", description: "Failed to update order" });
    }
  };

  // Soft delete: archive the full order into `deletedOrders` before removing it
  // from the active collection. Archived orders are never shown in the UI.
  const deleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      await setDocument(DELETED_ORDERS_COLLECTION, orderId, {
        ...order,
        deletedAt: new Date().toISOString(),
      });
      await deleteDocument(ORDERS_COLLECTION, orderId);
      await deleteDocument(STATUS_COLLECTION, orderId);

      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      toast({
        title: "Order Removed",
        description: `Order ${orderId} has been moved to deleted orders`,
      });
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast({ title: "Error", description: "Failed to delete order" });
    }
  };

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = order.customerName.toLowerCase().includes(term) ||
                         order.customerPhone.includes(searchTerm) ||
                         order.cartridges.some(c => c.model.toLowerCase().includes(term)) ||
                         order.id.toLowerCase().includes(term);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
              <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <ThemeToggleButton />
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
            Track customer cartridge refills from received to pickup
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
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name<RequiredMark /></Label>
                    <Input
                      {...newOrderForm.register('customerName', { required: true })}
                      placeholder="Enter customer name"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>

                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Phone Number<RequiredMark /></Label>
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

                  <CartridgeLineFields
                    form={newOrderForm}
                    themeClasses={themeClasses}
                    compact
                  />

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
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
                <CardContent className="p-12 text-center">
                  <Loader2 className={`h-12 w-12 mx-auto mb-4 animate-spin transition-colors duration-300 ${themeClasses.text.muted}`} />
                  <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Loading orders...</p>
                </CardContent>
              </Card>
            )}

            {/* Orders Grid */}
            {!loading && (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className={`shadow-2xl hover:shadow-3xl transition-all duration-300 ${themeClasses.card.primary}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className={`text-lg font-bold transition-colors duration-300 ${themeClasses.text.primary}`}>{order.customerName}</h3>
                            <Badge variant="outline" className={`${getStatusColor(order.status)} border flex items-center space-x-1`}>
                              {getStatusIcon(order.status)}
                              <span className="capitalize">{order.status.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          <p className={`text-sm font-mono transition-colors duration-300 ${themeClasses.text.secondary}`}>{order.id}</p>
                        </div>
                        <div className="flex space-x-2">
                          <ReceiptDialog order={order} themeClasses={themeClasses} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingOrder(editingOrder === order.id ? null : order.id)}
                            className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`transition-all duration-300 ${themeClasses.button.danger}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete order {order.id} for {order.customerName}.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteOrder(order.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {editingOrder === order.id ? (
                        <EditOrderForm
                          order={order}
                          themeClasses={themeClasses}
                          onSave={(data) => saveOrderEdits(order.id, data)}
                          onCancel={() => setEditingOrder(null)}
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">{order.customerPhone}</span>
                            </div>
                            <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                              <Mail className="h-4 w-4" />
                              <span className={`text-sm ${order.customerEmail ? '' : themeClasses.text.muted}`}>
                                {order.customerEmail || 'Unspecified'}
                              </span>
                            </div>
                            <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">Received: {order.dateReceived}</span>
                            </div>
                          </div>

                          <div className={`rounded-xl p-4 mb-4 transition-all duration-300 ${themeClasses.card.secondary}`}>
                            <h4 className={`font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                              {order.cartridges.length > 1
                                ? `Cartridge Details (${order.cartridges.length})`
                                : 'Cartridge Details'}
                            </h4>
                            <div className="space-y-3">
                              {order.cartridges.map((cartridge, index) => (
                                <div
                                  key={index}
                                  className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"
                                >
                                  <DetailField label="Brand" value={cartridge.brand} themeClasses={themeClasses} />
                                  <DetailField label="Model" value={cartridge.model} themeClasses={themeClasses} />
                                  <DetailField label="Type" value={cartridge.type} themeClasses={themeClasses} />
                                  <DetailField
                                    label="Price"
                                    value={isFilledNumber(cartridge.price) ? `$${cartridge.price.toFixed(2)}` : undefined}
                                    themeClasses={themeClasses}
                                  />
                                </div>
                              ))}
                            </div>

                            {order.cartridges.length > 1 && (
                              <div className={`mt-3 pt-3 border-t flex justify-between text-sm font-semibold transition-colors duration-300 ${themeClasses.text.primary}`}>
                                <span>Subtotal</span>
                                <span>${cartridgesSubtotal(order.cartridges).toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {order.notes && (
                            <div className={`rounded-xl p-3 mb-4 transition-all duration-300 ${themeClasses.status.info}`}>
                              <p className="text-sm">{order.notes}</p>
                            </div>
                          )}

                          {/* Status Update Buttons */}
                          <div className="flex flex-wrap gap-2">
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
                            {order.status !== 'picked_up' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateOrderStatus(order.id, 'picked_up')}
                                className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                              >
                                Mark Picked Up
                              </Button>
                            )}
                          </div>
                        </>
                      )}
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffCartridges;
