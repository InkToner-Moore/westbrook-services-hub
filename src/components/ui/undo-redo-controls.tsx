import React from 'react';
import { Button } from './button';
import { Undo2, Redo2, RotateCcw, History } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { UndoRedoAction } from '@/hooks/useUndoRedo';

export interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearHistory?: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showClearHistory?: boolean;
  showHistory?: boolean;
  history?: UndoRedoAction[];
  onSelectHistoryItem?: (action: UndoRedoAction) => void;
  shortcuts?: boolean;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearHistory,
  className,
  size = 'default',
  variant = 'outline',
  showClearHistory = true,
  showHistory = false,
  history = [],
  onSelectHistoryItem,
  shortcuts = true,
}) => {
  const { themeClasses } = useTheme();

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                'transition-all duration-200',
                variant === 'outline' && themeClasses.button.secondary,
                themeClasses.interactive.focus
              )}
            >
              <Undo2 className="h-4 w-4" />
              <span className="sr-only">Undo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Undo {shortcuts && '(Ctrl+Z)'}
              {canUndo && history.length > 0 && (
                <span className="block text-xs opacity-75">
                  {history[history.length - 1]?.description}
                </span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                'transition-all duration-200',
                variant === 'outline' && themeClasses.button.secondary,
                themeClasses.interactive.focus
              )}
            >
              <Redo2 className="h-4 w-4" />
              <span className="sr-only">Redo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Redo {shortcuts && '(Ctrl+Y)'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* History Dropdown */}
        {showHistory && history.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={size}
                className={cn(
                  'transition-all duration-200',
                  variant === 'outline' && themeClasses.button.secondary,
                  themeClasses.interactive.focus
                )}
              >
                <History className="h-4 w-4" />
                <span className="sr-only">History</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn('w-64', themeClasses.card.primary)}>
              <div className="px-2 py-1.5 text-sm font-semibold">
                Action History ({history.length})
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {history.slice(-10).reverse().map((action, index) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => onSelectHistoryItem?.(action)}
                    className="flex-col items-start py-2 cursor-pointer"
                  >
                    <div className="font-medium text-sm">
                      {action.description}
                    </div>
                    <div className="text-xs opacity-60">
                      {action.type} • {formatTimestamp(action.timestamp)}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              {history.length > 10 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-xs opacity-60">
                    Showing last 10 of {history.length} actions
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Clear History Button */}
        {showClearHistory && onClearHistory && history.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={size}
                onClick={onClearHistory}
                className={cn(
                  'transition-all duration-200 text-muted-foreground hover:text-foreground',
                  themeClasses.button.ghost,
                  themeClasses.interactive.focus
                )}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">Clear History</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear undo/redo history</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* History Counter */}
        {history.length > 0 && (
          <span className={cn('text-xs px-2 py-1 rounded', themeClasses.text.muted)}>
            {history.length} {history.length === 1 ? 'action' : 'actions'}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
};

// Compact version for smaller spaces
export const CompactUndoRedoControls: React.FC<Omit<UndoRedoControlsProps, 'showHistory' | 'showClearHistory'>> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
  size = 'sm',
  variant = 'ghost',
  shortcuts = true,
}) => {
  const { themeClasses } = useTheme();

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                'rounded-r-none border-r-0',
                variant === 'ghost' && themeClasses.button.ghost,
                themeClasses.interactive.focus
              )}
            >
              <Undo2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo {shortcuts && '(Ctrl+Z)'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                'rounded-l-none',
                variant === 'ghost' && themeClasses.button.ghost,
                themeClasses.interactive.focus
              )}
            >
              <Redo2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo {shortcuts && '(Ctrl+Y)'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

// History panel component
export interface HistoryPanelProps {
  history: UndoRedoAction[];
  onSelectAction?: (action: UndoRedoAction) => void;
  onClearHistory?: () => void;
  className?: string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onSelectAction,
  onClearHistory,
  className,
}) => {
  const { themeClasses } = useTheme();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'add-item':
      case 'create':
        return '＋';
      case 'remove-item':
      case 'delete':
        return '−';
      case 'update-item':
      case 'update':
        return '✎';
      case 'move-item':
      case 'move':
        return '↔';
      case 'undo':
        return '↶';
      case 'redo':
        return '↷';
      default:
        return '•';
    }
  };

  return (
    <div className={cn('border rounded-lg', themeClasses.card.primary, className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className={cn('font-semibold', themeClasses.text.primary)}>
          Action History
        </h3>
        {onClearHistory && history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
            className={themeClasses.button.ghost}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {history.length === 0 ? (
          <div className={cn('p-8 text-center', themeClasses.text.muted)}>
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No actions recorded yet</p>
            <p className="text-sm">Start making changes to see history</p>
          </div>
        ) : (
          <div className="p-2">
            {history.slice().reverse().map((action, index) => (
              <div
                key={action.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded cursor-pointer transition-colors',
                  themeClasses.interactive.hover,
                  themeClasses.interactive.focus
                )}
                onClick={() => onSelectAction?.(action)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAction?.(action);
                  }
                }}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono',
                  themeClasses.status.info
                )}>
                  {getActionIcon(action.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={cn('font-medium truncate', themeClasses.text.primary)}>
                    {action.description}
                  </div>
                  <div className={cn('text-xs', themeClasses.text.muted)}>
                    {action.type} • {formatTimestamp(action.timestamp)}
                  </div>
                </div>
                
                <div className={cn('text-xs font-mono', themeClasses.text.muted)}>
                  #{history.length - index}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UndoRedoControls;