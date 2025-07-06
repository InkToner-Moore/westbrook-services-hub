import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface FormSuccessMessageProps {
  message: string;
  title?: string;
  className?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const FormSuccessMessage: React.FC<FormSuccessMessageProps> = ({
  message,
  title = "Success!",
  className,
  onDismiss,
  showDismiss = true,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const { themeClasses } = useTheme();
  
  React.useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all duration-200',
      themeClasses.status.success,
      className
    )}>
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">
            {title}
          </h3>
          
          <p className="text-sm">
            {message}
          </p>
        </div>
        
        {showDismiss && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-green-200/20"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss message</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default FormSuccessMessage;