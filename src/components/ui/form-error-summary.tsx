import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface FormErrorSummaryProps {
  errors: Record<string, string>;
  title?: string;
  className?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title = "Please fix the following errors:",
  className,
  onDismiss,
  showDismiss = false
}) => {
  const { themeClasses } = useTheme();
  
  const errorEntries = Object.entries(errors).filter(([_, message]) => message);
  
  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all duration-200',
      themeClasses.status.error,
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-2">
            {title}
          </h3>
          
          <ul className="space-y-1">
            {errorEntries.map(([field, message]) => (
              <li key={field} className="text-sm">
                <span className="font-medium capitalize">
                  {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                </span>{' '}
                {message}
              </li>
            ))}
          </ul>
        </div>
        
        {showDismiss && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-red-200/20"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss errors</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default FormErrorSummary;