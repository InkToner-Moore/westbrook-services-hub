import React, { forwardRef, useState } from 'react';
import { Textarea } from './textarea';
import { Label } from './label';
import { useTheme } from '@/hooks/useTheme';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  required?: boolean;
  onValidate?: (value: string) => Promise<string | undefined> | string | undefined;
  showValidationIcon?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  containerClassName?: string;
}

const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(({
  label,
  error,
  success,
  hint,
  required = false,
  onValidate,
  showValidationIcon = true,
  showCharacterCount = false,
  maxLength,
  containerClassName,
  className,
  onChange,
  onBlur,
  id,
  value,
  ...props
}, ref) => {
  const { themeClasses } = useTheme();
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const displayError = error || internalError;
  const hasError = !!displayError;
  const isSuccess = success || (showSuccess && !hasError && value);
  const currentLength = typeof value === 'string' ? value.length : 0;
  
  const handleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    
    setShowSuccess(false);
    setInternalError(undefined);
    
    if (onValidate && newValue) {
      setIsValidating(true);
      try {
        const validationResult = await onValidate(newValue);
        setInternalError(validationResult);
        if (!validationResult) {
          setShowSuccess(true);
        }
      } catch (err) {
        setInternalError('Validation failed');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleBlur = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    onBlur?.(e);
    
    if (onValidate && e.target.value) {
      setIsValidating(true);
      try {
        const validationResult = await onValidate(e.target.value);
        setInternalError(validationResult);
        if (!validationResult) {
          setShowSuccess(true);
        }
      } catch (err) {
        setInternalError('Validation failed');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const inputId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label 
            htmlFor={inputId}
            className={cn(
              'font-medium transition-colors',
              themeClasses.text.primary,
              required && "after:content-['*'] after:ml-1 after:text-red-500"
            )}
          >
            {label}
          </Label>
          
          {showCharacterCount && maxLength && (
            <span className={cn(
              'text-sm transition-colors',
              currentLength > maxLength ? 'text-red-500' : themeClasses.text.muted
            )}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <Textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'transition-all duration-200',
            themeClasses.input,
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            isSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
            showValidationIcon && (hasError || isSuccess || isValidating) && 'pr-10',
            className
          )}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={hasError}
          aria-describedby={
            displayError ? `${inputId}-error` : 
            hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        
        {showValidationIcon && (
          <div className="absolute top-3 right-3">
            {isValidating && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            )}
            {!isValidating && hasError && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            {!isValidating && isSuccess && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}
      </div>
      
      {displayError && (
        <p 
          id={`${inputId}-error`}
          className={cn(
            'text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1'
          )}
          role="alert"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {displayError}
        </p>
      )}
      
      {hint && !displayError && (
        <p 
          id={`${inputId}-hint`}
          className={cn('text-sm', themeClasses.text.muted)}
        >
          {hint}
        </p>
      )}
    </div>
  );
});

ValidatedTextarea.displayName = 'ValidatedTextarea';

export { ValidatedTextarea };