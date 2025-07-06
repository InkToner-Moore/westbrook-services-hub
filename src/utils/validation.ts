import { z } from 'zod';

// Common validation schemas
export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number cannot exceed 15 digits')
  .regex(/^[\d\s\-\+\(\)]+$/, 'Phone number contains invalid characters');

export const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const requiredStringSchema = (fieldName: string, minLength = 1) => 
  z.string()
    .min(minLength, `${fieldName} is required`)
    .trim();

export const optionalStringSchema = z.string().optional();

export const numberSchema = (fieldName: string, min = 0) =>
  z.number({
    required_error: `${fieldName} is required`,
    invalid_type_error: `${fieldName} must be a valid number`
  })
  .min(min, `${fieldName} must be at least ${min}`);

export const positiveNumberSchema = (fieldName: string) =>
  numberSchema(fieldName, 0.01);

// Business-specific validation schemas
export const trackingNumberSchema = z.string()
  .min(8, 'Tracking number must be at least 8 characters')
  .max(35, 'Tracking number cannot exceed 35 characters')
  .regex(/^[A-Z0-9\-]+$/i, 'Tracking number can only contain letters, numbers, and hyphens');

export const receiptNumberSchema = z.string()
  .min(3, 'Receipt number must be at least 3 characters')
  .max(20, 'Receipt number cannot exceed 20 characters')
  .regex(/^[A-Z0-9\-]+$/i, 'Receipt number can only contain letters, numbers, and hyphens');

// Inventory validation schemas
export const inventoryItemSchema = z.object({
  brand: requiredStringSchema('Brand', 2),
  model: requiredStringSchema('Model', 1),
  type: optionalStringSchema,
  stockQuantity: numberSchema('Stock quantity', 0),
  reorderLevel: numberSchema('Reorder level', 0),
  costPrice: positiveNumberSchema('Cost price'),
  sellPrice: positiveNumberSchema('Sell price'),
  supplier: requiredStringSchema('Supplier', 2),
  notes: optionalStringSchema,
});

// Customer cartridge validation schemas
export const cartridgeSchema = z.object({
  customerName: requiredStringSchema('Customer name', 2),
  customerPhone: phoneSchema,
  cartridgeModel: requiredStringSchema('Cartridge model', 2),
  serviceType: z.enum(['refill', 'replacement'], {
    required_error: 'Service type is required'
  }),
  notes: optionalStringSchema,
});

// Receipt validation schemas
export const shippingReceiptSchema = z.object({
  receiptNumber: receiptNumberSchema,
  customerName: requiredStringSchema('Customer name', 2),
  customerPhone: phoneSchema,
  courier: requiredStringSchema('Courier', 2),
  trackingNumber: trackingNumberSchema,
  destinationCity: requiredStringSchema('Destination city', 2),
  destinationProvince: requiredStringSchema('Destination province', 2),
  destinationCountry: requiredStringSchema('Destination country', 2),
  subtotal: positiveNumberSchema('Subtotal'),
});

export const keyReceiptSchema = z.object({
  receiptNumber: receiptNumberSchema,
  customerName: requiredStringSchema('Customer name', 2),
  customerPhone: phoneSchema,
  keyItems: z.array(z.object({
    model: requiredStringSchema('Key model', 1),
    quantity: numberSchema('Quantity', 1),
    priceEach: positiveNumberSchema('Price each'),
  })).min(1, 'At least one key item is required'),
});

// Notes validation schemas
export const noteSchema = z.object({
  title: requiredStringSchema('Title', 3),
  content: requiredStringSchema('Content', 10),
  category: z.enum(['general', 'customer', 'inventory', 'shipping', 'urgent'], {
    required_error: 'Category is required'
  }),
});

// Blog post validation schemas
export const blogPostSchema = z.object({
  title: requiredStringSchema('Title', 5),
  content: requiredStringSchema('Content', 50),
  excerpt: requiredStringSchema('Excerpt', 20),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived'], {
    required_error: 'Status is required'
  }),
});

// Settings validation schemas
export const businessInfoSchema = z.object({
  name: requiredStringSchema('Business name', 2),
  phone: phoneSchema,
  email: emailSchema,
  address: requiredStringSchema('Address', 10),
  hours: requiredStringSchema('Business hours', 5),
});

export const integrationSettingsSchema = z.object({
  googleSheetsId: optionalStringSchema,
  googleApiKey: optionalStringSchema,
  firebaseProjectId: optionalStringSchema,
  customDomain: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

// Validation helper functions
export const validateField = <T>(schema: z.ZodSchema<T>, value: unknown): { isValid: boolean; error?: string } => {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { isValid: false, error: 'Validation failed' };
  }
};

export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { isValid: boolean; errors: Record<string, string>; data?: T } => {
  try {
    const validData = schema.parse(data);
    return { isValid: true, errors: {}, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Validation failed' } };
  }
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d\s\-\+\(\)]/g, '');
};

export const sanitizeTrackingNumber = (trackingNumber: string): string => {
  return trackingNumber.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
};