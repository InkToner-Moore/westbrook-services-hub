import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  AlertTriangle,
  Calendar,
  Target,
  BarChart3,
  PieChart
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface AnalyticsData {
  inventory?: Array<{
    id: string;
    category: string;
    stockQuantity: number;
    reorderLevel: number;
    costPrice: number;
    sellPrice: number;
    lastUpdated: string;
  }>;
  cartridges?: Array<{
    id: string;
    status: string;
    dateReceived: string;
    customerName: string;
  }>;
  receipts?: Array<{
    id: string;
    total: number;
    date: string;
    type: string;
  }>;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  className?: string;
}

const AnalyticsDashboard = ({ data, className = "" }: AnalyticsDashboardProps) => {
  const { themeClasses } = useTheme();

  // Calculate inventory metrics
  const inventoryMetrics = useMemo(() => {
    if (!data.inventory) return null;

    const totalItems = data.inventory.length;
    const lowStockItems = data.inventory.filter(item => 
      item.stockQuantity <= item.reorderLevel && item.stockQuantity > 0
    ).length;
    const outOfStockItems = data.inventory.filter(item => 
      item.stockQuantity === 0
    ).length;
    const totalValue = data.inventory.reduce((sum, item) => 
      sum + (item.stockQuantity * item.costPrice), 0
    );
    const potentialRevenue = data.inventory.reduce((sum, item) => 
      sum + (item.stockQuantity * item.sellPrice), 0
    );
    
    const cartridgeItems = data.inventory.filter(item => item.category === 'cartridge').length;
    const keyItems = data.inventory.filter(item => item.category === 'key').length;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      potentialRevenue,
      cartridgeItems,
      keyItems,
      averageMargin: totalValue > 0 ? ((potentialRevenue - totalValue) / potentialRevenue * 100) : 0
    };
  }, [data.inventory]);

  // Calculate cartridge metrics
  const cartridgeMetrics = useMemo(() => {
    if (!data.cartridges) return null;

    const totalCartridges = data.cartridges.length;
    const completed = data.cartridges.filter(c => c.status === 'completed').length;
    const inProgress = data.cartridges.filter(c => c.status === 'in_progress').length;
    const received = data.cartridges.filter(c => c.status === 'received').length;
    
    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentActivity = data.cartridges.filter(c => 
      new Date(c.dateReceived) >= weekAgo
    ).length;

    return {
      totalCartridges,
      completed,
      inProgress,
      received,
      recentActivity,
      completionRate: totalCartridges > 0 ? (completed / totalCartridges * 100) : 0
    };
  }, [data.cartridges]);

  // Calculate revenue metrics
  const revenueMetrics = useMemo(() => {
    if (!data.receipts) return null;

    const totalRevenue = data.receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const shippingRevenue = data.receipts
      .filter(r => r.type === 'shipping')
      .reduce((sum, receipt) => sum + receipt.total, 0);
    const keyRevenue = data.receipts
      .filter(r => r.type === 'key')
      .reduce((sum, receipt) => sum + receipt.total, 0);

    // Monthly comparison
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthRevenue = data.receipts
      .filter(r => {
        const date = new Date(r.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, receipt) => sum + receipt.total, 0);

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthRevenue = data.receipts
      .filter(r => {
        const date = new Date(r.date);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      })
      .reduce((sum, receipt) => sum + receipt.total, 0);

    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) 
      : 0;

    return {
      totalRevenue,
      shippingRevenue,
      keyRevenue,
      currentMonthRevenue,
      lastMonthRevenue,
      monthlyGrowth,
      averageOrderValue: data.receipts.length > 0 ? totalRevenue / data.receipts.length : 0
    };
  }, [data.receipts]);

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color, 
    trend, 
    trendValue 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }) => (
    <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-105 ${themeClasses.card.primary}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs transition-all duration-500 ${themeClasses.text.muted}`}>
                {subtitle}
              </p>
            )}
            {trend && trendValue && (
              <div className="flex items-center mt-2">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-400 mr-1" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400 mr-1" />}
                <span className={`text-xs font-medium ${
                  trend === 'up' ? 'text-green-400' : 
                  trend === 'down' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`${color} p-3 rounded-xl shadow-2xl`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Inventory Analytics */}
      {inventoryMetrics && (
        <div>
          <h3 className={`text-lg font-semibold mb-4 transition-all duration-500 ${themeClasses.text.primary}`}>
            Inventory Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Items"
              value={inventoryMetrics.totalItems}
              icon={Package}
              color="bg-gradient-to-r from-blue-500 to-indigo-600"
              subtitle={`${inventoryMetrics.cartridgeItems} cartridges, ${inventoryMetrics.keyItems} keys`}
            />
            <MetricCard
              title="Low Stock Alerts"
              value={inventoryMetrics.lowStockItems}
              icon={AlertTriangle}
              color="bg-gradient-to-r from-yellow-500 to-orange-600"
              trend={inventoryMetrics.lowStockItems > 0 ? 'down' : 'neutral'}
              trendValue={inventoryMetrics.lowStockItems > 0 ? 'Needs attention' : 'All good'}
            />
            <MetricCard
              title="Out of Stock"
              value={inventoryMetrics.outOfStockItems}
              icon={TrendingDown}
              color="bg-gradient-to-r from-red-500 to-red-600"
              trend={inventoryMetrics.outOfStockItems > 0 ? 'down' : 'neutral'}
              trendValue={inventoryMetrics.outOfStockItems > 0 ? 'Urgent reorder' : 'Stock healthy'}
            />
            <MetricCard
              title="Inventory Value"
              value={`$${inventoryMetrics.totalValue.toFixed(0)}`}
              icon={DollarSign}
              color="bg-gradient-to-r from-green-500 to-emerald-600"
              subtitle={`Avg margin: ${inventoryMetrics.averageMargin.toFixed(1)}%`}
            />
          </div>
        </div>
      )}

      {/* Cartridge Processing Analytics */}
      {cartridgeMetrics && (
        <div>
          <h3 className={`text-lg font-semibold mb-4 transition-all duration-500 ${themeClasses.text.primary}`}>
            Cartridge Processing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Jobs"
              value={cartridgeMetrics.totalCartridges}
              icon={Users}
              color="bg-gradient-to-r from-purple-500 to-violet-600"
              subtitle={`${cartridgeMetrics.recentActivity} this week`}
            />
            <MetricCard
              title="In Progress"
              value={cartridgeMetrics.inProgress}
              icon={Target}
              color="bg-gradient-to-r from-blue-500 to-indigo-600"
            />
            <MetricCard
              title="Completed"
              value={cartridgeMetrics.completed}
              icon={TrendingUp}
              color="bg-gradient-to-r from-green-500 to-emerald-600"
              trendValue={`${cartridgeMetrics.completionRate.toFixed(1)}% completion rate`}
            />
            <MetricCard
              title="Pending"
              value={cartridgeMetrics.received}
              icon={Calendar}
              color="bg-gradient-to-r from-yellow-500 to-orange-600"
              trend={cartridgeMetrics.received > 5 ? 'up' : 'neutral'}
              trendValue={cartridgeMetrics.received > 5 ? 'High volume' : 'Normal'}
            />
          </div>
        </div>
      )}

      {/* Revenue Analytics */}
      {revenueMetrics && (
        <div>
          <h3 className={`text-lg font-semibold mb-4 transition-all duration-500 ${themeClasses.text.primary}`}>
            Revenue Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue"
              value={`$${revenueMetrics.totalRevenue.toFixed(0)}`}
              icon={DollarSign}
              color="bg-gradient-to-r from-green-500 to-emerald-600"
              subtitle={`Avg order: $${revenueMetrics.averageOrderValue.toFixed(2)}`}
            />
            <MetricCard
              title="This Month"
              value={`$${revenueMetrics.currentMonthRevenue.toFixed(0)}`}
              icon={TrendingUp}
              color="bg-gradient-to-r from-blue-500 to-indigo-600"
              trend={revenueMetrics.monthlyGrowth >= 0 ? 'up' : 'down'}
              trendValue={`${revenueMetrics.monthlyGrowth.toFixed(1)}% vs last month`}
            />
            <MetricCard
              title="Shipping Revenue"
              value={`$${revenueMetrics.shippingRevenue.toFixed(0)}`}
              icon={Package}
              color="bg-gradient-to-r from-purple-500 to-violet-600"
              subtitle={`${((revenueMetrics.shippingRevenue / revenueMetrics.totalRevenue) * 100).toFixed(1)}% of total`}
            />
            <MetricCard
              title="Key Revenue"
              value={`$${revenueMetrics.keyRevenue.toFixed(0)}`}
              icon={Target}
              color="bg-gradient-to-r from-orange-500 to-red-600"
              subtitle={`${((revenueMetrics.keyRevenue / revenueMetrics.totalRevenue) * 100).toFixed(1)}% of total`}
            />
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.primary}`}>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
            <BarChart3 className="h-5 w-5" />
            <span>Quick Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryMetrics && inventoryMetrics.lowStockItems > 0 && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-400/30">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className={`font-semibold transition-all duration-500 ${themeClasses.text.primary}`}>
                    Stock Alert
                  </span>
                </div>
                <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>
                  {inventoryMetrics.lowStockItems} items need reordering
                </p>
              </div>
            )}

            {cartridgeMetrics && cartridgeMetrics.received > 3 && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-400/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className={`font-semibold transition-all duration-500 ${themeClasses.text.primary}`}>
                    Busy Period
                  </span>
                </div>
                <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>
                  {cartridgeMetrics.received} cartridges awaiting processing
                </p>
              </div>
            )}

            {revenueMetrics && revenueMetrics.monthlyGrowth > 10 && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-400/30">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className={`font-semibold transition-all duration-500 ${themeClasses.text.primary}`}>
                    Growth
                  </span>
                </div>
                <p className={`text-sm transition-all duration-500 ${themeClasses.text.muted}`}>
                  Revenue up {revenueMetrics.monthlyGrowth.toFixed(1)}% this month
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;