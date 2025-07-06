import { useState, useEffect, useCallback } from 'react';
import { googleSheetsService } from '@/services/googleSheets';

interface UseGoogleSheetsReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  updateItem: (id: string, item: Partial<T>) => Promise<T>;
  deleteItem: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useGoogleSheets<T extends { id: string }>(
  tableName: 'inventory' | 'cartridges' | 'receipts' | 'notes' | 'stickyNotes' | 'blogPosts'
): UseGoogleSheetsReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await googleSheetsService.getData(tableName);
      setData(result as T[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error(`Error fetching ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  const addItem = useCallback(async (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
    try {
      const newItem = await googleSheetsService.addData(tableName, item);
      setData(prevData => [newItem as T, ...prevData]);
      return newItem as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [tableName]);

  const updateItem = useCallback(async (id: string, item: Partial<T>): Promise<T> => {
    try {
      const updatedItem = await googleSheetsService.updateData(tableName, id, item);
      setData(prevData => 
        prevData.map(existingItem => 
          existingItem.id === id ? updatedItem as T : existingItem
        )
      );
      return updatedItem as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [tableName]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await googleSheetsService.deleteData(tableName, id);
      if (success) {
        setData(prevData => prevData.filter(item => item.id !== id));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [tableName]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch
  };
}

// Specific hooks for each data type
export const useInventory = () => useGoogleSheets<{
  id: string;
  category: 'cartridge' | 'key';
  brand: string;
  model: string;
  type?: string;
  stockQuantity: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  supplier: string;
  lastUpdated: string;
  notes?: string;
}>('inventory');

export const useCartridges = () => useGoogleSheets<{
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  cartridgeType: string;
  quantity: number;
  status: 'received' | 'in_progress' | 'completed' | 'ready_for_pickup';
  dateReceived: string;
  estimatedCompletion: string;
  notes?: string;
}>('cartridges');

export const useReceipts = () => useGoogleSheets<{
  id: string;
  type: 'shipping' | 'key';
  customerName: string;
  date: string;
  items: Array<{ description: string; price: number; quantity?: number }>;
  subtotal: number;
  tax: number;
  total: number;
}>('receipts');

export const useNotes = () => useGoogleSheets<{
  id: string;
  title: string;
  content: string;
  category: 'general' | 'customer' | 'inventory' | 'shipping' | 'urgent';
  createdAt: string;
  updatedAt: string;
  author: string;
}>('notes');

export const useStickyNotes = () => useGoogleSheets<{
  id: string;
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'orange';
  position: { x: number; y: number };
  createdAt: string;
}>('stickyNotes');

export const useBlogPosts = () => useGoogleSheets<{
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
  publishDate: string;
  author: string;
  tags: string[];
}>('blogPosts');