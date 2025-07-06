import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateForm, validateField } from '@/utils/validation';

export interface ValidationState {
  errors: Record<string, string>;
  isValid: boolean;
  hasAttemptedSubmit: boolean;
}

export interface UseValidationReturn<T> {
  errors: Record<string, string>;
  isValid: boolean;
  hasAttemptedSubmit: boolean;
  validateField: (fieldName: string, value: unknown) => boolean;
  validateForm: (data: unknown) => { isValid: boolean; data?: T };
  clearErrors: () => void;
  clearFieldError: (fieldName: string) => void;
  setFieldError: (fieldName: string, error: string) => void;
  markSubmitAttempted: () => void;
}

export function useValidation<T>(schema: z.ZodSchema<T>): UseValidationReturn<T> {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    isValid: true,
    hasAttemptedSubmit: false,
  });

  const validateFieldCallback = useCallback((fieldName: string, value: unknown): boolean => {
    // Get the field schema from the main schema
    try {
      const fieldSchema = (schema as any).shape[fieldName];
      if (!fieldSchema) {
        console.warn(`Field ${fieldName} not found in schema`);
        return true;
      }

      const result = validateField(fieldSchema, value);
      
      setValidationState(prev => ({
        ...prev,
        errors: result.isValid 
          ? { ...prev.errors, [fieldName]: undefined }
          : { ...prev.errors, [fieldName]: result.error || 'Validation failed' },
        isValid: result.isValid && Object.keys({ ...prev.errors, [fieldName]: result.error }).filter(key => key !== fieldName && prev.errors[key]).length === 0
      }));

      return result.isValid;
    } catch (error) {
      console.warn(`Failed to validate field ${fieldName}:`, error);
      return true;
    }
  }, [schema]);

  const validateFormCallback = useCallback((data: unknown): { isValid: boolean; data?: T } => {
    const result = validateForm(schema, data);
    
    setValidationState(prev => ({
      ...prev,
      errors: result.errors,
      isValid: result.isValid,
      hasAttemptedSubmit: true,
    }));

    return result;
  }, [schema]);

  const clearErrors = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setValidationState(prev => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: undefined },
    }));
  }, []);

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setValidationState(prev => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: error },
      isValid: false,
    }));
  }, []);

  const markSubmitAttempted = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      hasAttemptedSubmit: true,
    }));
  }, []);

  return {
    errors: validationState.errors,
    isValid: validationState.isValid,
    hasAttemptedSubmit: validationState.hasAttemptedSubmit,
    validateField: validateFieldCallback,
    validateForm: validateFormCallback,
    clearErrors,
    clearFieldError,
    setFieldError,
    markSubmitAttempted,
  };
}

// Hook for real-time field validation
export function useFieldValidation<T>(
  schema: z.ZodSchema<T>, 
  fieldName: string,
  debounceMs = 300
) {
  const [error, setError] = useState<string | undefined>();
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback((value: unknown) => {
    setIsValidating(true);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      try {
        const fieldSchema = (schema as any).shape[fieldName];
        if (fieldSchema) {
          const result = validateField(fieldSchema, value);
          setError(result.error);
        }
      } catch (err) {
        console.warn(`Failed to validate field ${fieldName}:`, err);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [schema, fieldName, debounceMs]);

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  return {
    error,
    isValidating,
    validate,
    clearError,
    hasError: !!error,
  };
}