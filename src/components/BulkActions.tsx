import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, 
  Edit, 
  Download, 
  Upload,
  CheckSquare,
  Square,
  MoreHorizontal,
  Tag,
  Archive,
  Eye,
  Copy
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";

interface BulkAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  action: (selectedIds: string[]) => Promise<void> | void;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

interface BulkActionsProps {
  items: Array<{ id: string; [key: string]: any }>;
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  actions: BulkAction[];
  renderItem: (item: any, isSelected: boolean) => React.ReactNode;
  className?: string;
}

const BulkActions = ({
  items,
  selectedIds,
  onSelectionChange,
  actions,
  renderItem,
  className = ""
}: BulkActionsProps) => {
  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const { themeClasses } = useTheme();

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  const executeAction = async (action: BulkAction) => {
    if (selectedIds.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to perform this action",
        variant: "destructive"
      });
      return;
    }

    if (action.requiresConfirmation) {
      setIsConfirming(action.id);
      return;
    }

    try {
      await action.action(selectedIds);
      toast({
        title: "Action completed",
        description: `${action.label} completed for ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}`,
      });
      onSelectionChange([]);
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const confirmAction = async (action: BulkAction) => {
    setIsConfirming(null);
    await executeAction(action);
  };

  const getSelectionIcon = () => {
    if (isAllSelected) {
      return <CheckSquare className="h-4 w-4" />;
    } else if (isPartiallySelected) {
      return <Square className="h-4 w-4 opacity-50" />;
    } else {
      return <Square className="h-4 w-4" />;
    }
  };

  const confirmingAction = actions.find(a => a.id === isConfirming);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bulk Actions Header */}
      {items.length > 0 && (
        <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className={`p-2 transition-all duration-300 ${themeClasses.button.ghost}`}
                >
                  {getSelectionIcon()}
                </Button>
                <CardTitle className={`transition-all duration-500 ${themeClasses.text.primary}`}>
                  {selectedIds.length > 0 ? (
                    <span>
                      {selectedIds.length} of {items.length} selected
                    </span>
                  ) : (
                    <span>Select items for bulk actions</span>
                  )}
                </CardTitle>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center space-x-2">
                  {actions.map(action => (
                    <Button
                      key={action.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => executeAction(action)}
                      className={`transition-all duration-300 ${action.color} ${themeClasses.button.ghost}`}
                      title={action.label}
                    >
                      <action.icon className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">{action.label}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center space-x-2 pt-2">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/50 border">
                  {selectedIds.length} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectionChange([])}
                  className={`text-xs ${themeClasses.button.ghost}`}
                >
                  Clear selection
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {confirmingAction && (
        <Card className={`backdrop-blur-xl shadow-2xl border-red-400/50 transition-all duration-500 ${themeClasses.card}`}>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <confirmingAction.icon className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                  Confirm {confirmingAction.label}
                </h3>
                <p className={`text-sm mb-4 transition-all duration-500 ${themeClasses.text.muted}`}>
                  {confirmingAction.confirmationMessage || 
                   `Are you sure you want to ${confirmingAction.label.toLowerCase()} ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`}
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => confirmAction(confirmingAction)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Yes, {confirmingAction.label}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsConfirming(null)}
                    className={themeClasses.button.ghost}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="relative">
            <div className="flex items-start space-x-3">
              <div className="pt-2">
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => handleSelectItem(item.id)}
                  className="transition-all duration-300"
                />
              </div>
              <div className="flex-1">
                {renderItem(item, selectedIds.includes(item.id))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <div className={`text-center transition-all duration-500 ${themeClasses.text.muted}`}>
            <MoreHorizontal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items to display</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Predefined bulk actions for common use cases
export const createInventoryBulkActions = (
  onDelete: (ids: string[]) => Promise<void>,
  onExport: (ids: string[]) => void,
  onUpdateCategory: (ids: string[], category: string) => Promise<void>
): BulkAction[] => [
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    color: 'text-red-300 hover:text-white hover:bg-red-500/20',
    action: onDelete,
    requiresConfirmation: true,
    confirmationMessage: 'This will permanently delete the selected inventory items and cannot be undone.'
  },
  {
    id: 'export',
    label: 'Export',
    icon: Download,
    color: 'text-green-300 hover:text-white hover:bg-green-500/20',
    action: onExport
  }
];

export const createCartridgeBulkActions = (
  onStatusUpdate: (ids: string[], status: string) => Promise<void>,
  onDelete: (ids: string[]) => Promise<void>
): BulkAction[] => [
  {
    id: 'mark-completed',
    label: 'Mark Completed',
    icon: CheckSquare,
    color: 'text-green-300 hover:text-white hover:bg-green-500/20',
    action: (ids) => onStatusUpdate(ids, 'completed')
  },
  {
    id: 'mark-in-progress',
    label: 'Mark In Progress',
    icon: Edit,
    color: 'text-blue-300 hover:text-white hover:bg-blue-500/20',
    action: (ids) => onStatusUpdate(ids, 'in_progress')
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    color: 'text-red-300 hover:text-white hover:bg-red-500/20',
    action: onDelete,
    requiresConfirmation: true
  }
];

export const createNotesBulkActions = (
  onDelete: (ids: string[]) => Promise<void>,
  onCategoryUpdate: (ids: string[], category: string) => Promise<void>,
  onArchive: (ids: string[]) => Promise<void>
): BulkAction[] => [
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    color: 'text-yellow-300 hover:text-white hover:bg-yellow-500/20',
    action: onArchive
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    color: 'text-red-300 hover:text-white hover:bg-red-500/20',
    action: onDelete,
    requiresConfirmation: true
  }
];

export default BulkActions;