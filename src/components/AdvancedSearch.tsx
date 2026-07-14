import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export interface SearchFilters {
  searchTerm: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  stockLevel?: 'low' | 'normal' | 'high' | 'out';
  tags?: string[];
}

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  searchFields?: {
    categories?: { value: string; label: string }[];
    statuses?: { value: string; label: string }[];
    showPriceRange?: boolean;
    showDateRange?: boolean;
    showStockLevel?: boolean;
    showTags?: boolean;
    availableTags?: string[];
  };
  placeholder?: string;
}

const AdvancedSearch = ({ 
  filters, 
  onFiltersChange, 
  searchFields = {},
  placeholder = "Search..."
}: AdvancedSearchProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { themeClasses } = useTheme();

  const {
    categories = [],
    statuses = [],
    showPriceRange = false,
    showDateRange = false,
    showStockLevel = false,
    showTags = false,
    availableTags = []
  } = searchFields;

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      category: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      priceMin: undefined,
      priceMax: undefined,
      stockLevel: undefined,
      tags: []
    });
  };

  const addTag = (tag: string) => {
    const currentTags = filters.tags || [];
    if (!currentTags.includes(tag)) {
      updateFilters({ tags: [...currentTags, tag] });
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = filters.tags || [];
    updateFilters({ tags: currentTags.filter(t => t !== tag) });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.status) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.stockLevel) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.primary}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
            <Search className="h-5 w-5" />
            <span>Search & Filter</span>
            {activeFiltersCount > 0 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/50 border text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={themeClasses.button.ghost}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
            {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-3 h-4 w-4 transition-all duration-500 ${themeClasses.text.secondary}`} />
          <Input
            placeholder={placeholder}
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            className={`pl-10 transition-all duration-500 ${themeClasses.input}`}
          />
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Category Filter */}
              {categories.length > 0 && (
                <div>
                  <Label className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.primary}`}>
                    Category
                  </Label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => updateFilters({ category: e.target.value || undefined })}
                    className={`w-full p-2 rounded-md border transition-all duration-500 ${themeClasses.input}`}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              {statuses.length > 0 && (
                <div>
                  <Label className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.primary}`}>
                    Status
                  </Label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => updateFilters({ status: e.target.value || undefined })}
                    className={`w-full p-2 rounded-md border transition-all duration-500 ${themeClasses.input}`}
                  >
                    <option value="">All Statuses</option>
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stock Level Filter */}
              {showStockLevel && (
                <div>
                  <Label className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.primary}`}>
                    <Package className="h-4 w-4 inline mr-1" />
                    Stock Level
                  </Label>
                  <select
                    value={filters.stockLevel || ''}
                    onChange={(e) => updateFilters({ stockLevel: e.target.value as any || undefined })}
                    className={`w-full p-2 rounded-md border transition-all duration-500 ${themeClasses.input}`}
                  >
                    <option value="">All Levels</option>
                    <option value="out">Out of Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="normal">Normal Stock</option>
                    <option value="high">High Stock</option>
                  </select>
                </div>
              )}
            </div>

            {/* Date Range */}
            {showDateRange && (
              <div>
                <Label className={`text-sm font-medium mb-2 block transition-all duration-500 ${themeClasses.text.primary}`}>
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date Range
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Price Range */}
            {showPriceRange && (
              <div>
                <Label className={`text-sm font-medium mb-2 block transition-all duration-500 ${themeClasses.text.primary}`}>
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Price Range
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>Min ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={filters.priceMin?.toString() || ''}
                      onChange={(e) => updateFilters({ priceMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>Max ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="999.99"
                      value={filters.priceMax?.toString() || ''}
                      onChange={(e) => updateFilters({ priceMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {showTags && availableTags.length > 0 && (
              <div>
                <Label className={`text-sm font-medium mb-2 block transition-all duration-500 ${themeClasses.text.primary}`}>
                  Tags
                </Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={`cursor-pointer transition-all duration-300 ${
                          filters.tags?.includes(tag)
                            ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/50'
                            : 'hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                        onClick={() => {
                          if (filters.tags?.includes(tag)) {
                            removeTag(tag);
                          } else {
                            addTag(tag);
                          }
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {filters.tags && filters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>Selected:</span>
                      {filters.tags.map(tag => (
                        <Badge
                          key={tag}
                          className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/50 border"
                        >
                          {tag}
                          <X 
                            className="h-3 w-3 ml-1 cursor-pointer hover:text-white" 
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-white/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className={`text-red-300 hover:text-white hover:bg-red-500/20 ${themeClasses.button.ghost}`}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <div className={`text-sm transition-all duration-500 ${themeClasses.text.secondary}`}>
                {activeFiltersCount > 0 && `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedSearch;