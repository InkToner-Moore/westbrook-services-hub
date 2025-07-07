import React from 'react';
import { Switch } from './switch';
import { Label } from './label';
import { Badge } from './badge';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

export interface FeatureToggleProps {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  dependencies?: string[];
  dependsOn?: string[];
  affects?: string[];
  warning?: string;
  info?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  id,
  label,
  description,
  enabled,
  onToggle,
  disabled = false,
  badge,
  dependencies,
  dependsOn,
  affects,
  warning,
  info,
  className,
  size = 'default',
}) => {
  const { themeClasses } = useTheme();

  const hasWarning = !!warning;
  const hasInfo = !!info;
  const hasDependencies = dependsOn && dependsOn.length > 0;
  const hasAffects = affects && affects.length > 0;

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-all duration-200',
        enabled ? themeClasses.card.accent : themeClasses.card.secondary,
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Label 
              htmlFor={id}
              className={cn(
                'font-medium cursor-pointer transition-colors',
                size === 'sm' && 'text-sm',
                size === 'lg' && 'text-lg',
                themeClasses.text.primary
              )}
            >
              {label}
            </Label>
            
            {badge && (
              <Badge variant={badge.variant || 'secondary'} className="text-xs">
                {badge.text}
              </Badge>
            )}

            {hasWarning && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{warning}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {hasInfo && (
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-blue-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{info}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {enabled && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>

          {description && (
            <p className={cn(
              'text-sm leading-relaxed',
              size === 'sm' && 'text-xs',
              themeClasses.text.secondary
            )}>
              {description}
            </p>
          )}

          {hasDependencies && (
            <div className="flex items-center gap-1 text-xs">
              <span className={themeClasses.text.muted}>Requires:</span>
              {dependsOn.map((dep, index) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          )}

          {hasAffects && enabled && (
            <div className="flex items-center gap-1 text-xs">
              <span className={themeClasses.text.muted}>Affects:</span>
              {affects.map((affect, index) => (
                <Badge key={affect} variant="secondary" className="text-xs">
                  {affect}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="ml-4">
          <Switch
            id={id}
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={disabled}
            className="data-[state=checked]:bg-green-600"
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

// Group of related feature toggles
export interface FeatureToggleGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const FeatureToggleGroup: React.FC<FeatureToggleGroupProps> = ({
  title,
  description,
  children,
  enabled,
  onToggle,
  className,
  collapsible = true,
  defaultExpanded = true,
}) => {
  const { themeClasses } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden transition-all duration-200',
      enabled ? themeClasses.card.primary : themeClasses.card.secondary,
      className
    )}>
      {/* Group Header */}
      <div 
        className={cn(
          'p-4 border-b cursor-pointer transition-colors',
          themeClasses.interactive.hover
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={cn('font-semibold', themeClasses.text.primary)}>
                {title}
              </h3>
              {enabled ? (
                <Badge variant="default" className="bg-green-600">
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Disabled
                </Badge>
              )}
            </div>
            {description && (
              <p className={cn('text-sm mt-1', themeClasses.text.secondary)}>
                {description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="data-[state=checked]:bg-green-600"
            />
            {collapsible && (
              <div className={cn(
                'transform transition-transform duration-200',
                isExpanded ? 'rotate-180' : 'rotate-0'
              )}>
                ▼
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className={cn(
          'transition-all duration-200',
          !enabled && 'opacity-50 pointer-events-none'
        )}>
          <div className="p-4 space-y-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// Preset configurations
export const FeaturePresets = {
  minimal: {
    label: 'Minimal Setup',
    description: 'Basic features only - tracking and receipts',
    features: [
      'modules.packageTracking.enabled',
      'modules.receiptGenerator.enabled',
      'system.printFunctionality',
      'userInterface.darkModeToggle'
    ]
  },
  standard: {
    label: 'Standard Business',
    description: 'Recommended features for most businesses',
    features: [
      'modules.packageTracking.enabled',
      'modules.receiptGenerator.enabled',
      'modules.cartridgeManager.enabled',
      'modules.inventory.enabled',
      'modules.notes.enabled',
      'system.undoRedo',
      'system.printFunctionality',
      'system.dataExport',
      'userInterface.darkModeToggle'
    ]
  },
  advanced: {
    label: 'Full Featured',
    description: 'All available features enabled',
    features: [
      'modules.packageTracking.enabled',
      'modules.receiptGenerator.enabled',
      'modules.cartridgeManager.enabled',
      'modules.inventory.enabled',
      'modules.notes.enabled',
      'modules.blog.enabled',
      'modules.directory.enabled',
      'system.undoRedo',
      'system.keyboardShortcuts',
      'system.printFunctionality',
      'system.dataExport',
      'system.bulkOperations',
      'system.advancedSearch',
      'dashboard.analytics',
      'userInterface.darkModeToggle',
      'userInterface.animations'
    ]
  }
};

export default FeatureToggle;