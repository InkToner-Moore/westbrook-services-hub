import React, { useState, useCallback, useRef } from 'react';

export interface UndoRedoAction<T = any> {
  id: string;
  type: string;
  timestamp: number;
  description: string;
  data: T;
  undo: () => void;
  redo: () => void;
}

export interface UndoRedoState<T = any> {
  current: T;
  history: UndoRedoAction[];
  future: UndoRedoAction[];
  maxHistorySize: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface UseUndoRedoOptions {
  maxHistorySize?: number;
  debounceMs?: number;
  enableShortcuts?: boolean;
}

export interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T, actionType?: string, description?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  getHistorySize: () => number;
  getFutureSize: () => number;
  history: UndoRedoAction[];
  executeAction: (action: Omit<UndoRedoAction, 'id' | 'timestamp'>) => void;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const {
    maxHistorySize = 50,
    debounceMs = 300,
    enableShortcuts = true
  } = options;

  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState<T>>({
    current: initialState,
    history: [],
    future: [],
    maxHistorySize,
    canUndo: false,
    canRedo: false,
  });

  const debounceRef = useRef<NodeJS.Timeout>();
  const lastActionRef = useRef<string>('');

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableShortcuts) return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (
      (event.ctrlKey || event.metaKey) && 
      (event.key === 'y' || (event.key === 'z' && event.shiftKey))
    ) {
      event.preventDefault();
      redo();
    }
  }, []);

  // Set up keyboard listeners
  React.useEffect(() => {
    if (enableShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableShortcuts]);

  const setState = useCallback((
    newState: T, 
    actionType: string = 'update', 
    description: string = 'State updated'
  ) => {
    // Clear any pending debounced action
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce similar actions
    const actionKey = `${actionType}-${JSON.stringify(newState).slice(0, 100)}`;
    if (lastActionRef.current === actionKey && debounceMs > 0) {
      debounceRef.current = setTimeout(() => {
        performStateUpdate(newState, actionType, description);
      }, debounceMs);
      return;
    }

    performStateUpdate(newState, actionType, description);
    lastActionRef.current = actionKey;
  }, [debounceMs]);

  const performStateUpdate = useCallback((
    newState: T,
    actionType: string,
    description: string
  ) => {
    setUndoRedoState(prevState => {
      if (JSON.stringify(prevState.current) === JSON.stringify(newState)) {
        return prevState; // No change, don't add to history
      }

      const previousState = prevState.current;
      
      const action: UndoRedoAction<T> = {
        id: `${actionType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: actionType,
        timestamp: Date.now(),
        description,
        data: previousState,
        undo: () => setState(previousState, 'undo', `Undo: ${description}`),
        redo: () => setState(newState, 'redo', `Redo: ${description}`),
      };

      const newHistory = [...prevState.history, action];
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      return {
        ...prevState,
        current: newState,
        history: newHistory,
        future: [], // Clear future when new action is performed
        canUndo: newHistory.length > 0,
        canRedo: false,
      };
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    setUndoRedoState(prevState => {
      if (prevState.history.length === 0) {
        return prevState;
      }

      const lastAction = prevState.history[prevState.history.length - 1];
      const newHistory = prevState.history.slice(0, -1);
      const newFuture = [...prevState.future, {
        ...lastAction,
        data: prevState.current, // Store current state as redo data
      }];

      return {
        ...prevState,
        current: lastAction.data,
        history: newHistory,
        future: newFuture,
        canUndo: newHistory.length > 0,
        canRedo: true,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setUndoRedoState(prevState => {
      if (prevState.future.length === 0) {
        return prevState;
      }

      const nextAction = prevState.future[prevState.future.length - 1];
      const newFuture = prevState.future.slice(0, -1);
      const newHistory = [...prevState.history, {
        ...nextAction,
        data: prevState.current, // Store current state as undo data
      }];

      return {
        ...prevState,
        current: nextAction.data,
        history: newHistory,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setUndoRedoState(prevState => ({
      ...prevState,
      history: [],
      future: [],
      canUndo: false,
      canRedo: false,
    }));
  }, []);

  const executeAction = useCallback((action: Omit<UndoRedoAction, 'id' | 'timestamp'>) => {
    const fullAction: UndoRedoAction = {
      ...action,
      id: `${action.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Execute the action
    fullAction.redo();

    // Add to history
    setUndoRedoState(prevState => {
      const newHistory = [...prevState.history, fullAction];
      
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      return {
        ...prevState,
        history: newHistory,
        future: [],
        canUndo: newHistory.length > 0,
        canRedo: false,
      };
    });
  }, [maxHistorySize]);

  const getHistorySize = useCallback(() => undoRedoState.history.length, [undoRedoState.history.length]);
  const getFutureSize = useCallback(() => undoRedoState.future.length, [undoRedoState.future.length]);

  return {
    state: undoRedoState.current,
    setState,
    undo,
    redo,
    canUndo: undoRedoState.canUndo,
    canRedo: undoRedoState.canRedo,
    clearHistory,
    getHistorySize,
    getFutureSize,
    history: undoRedoState.history,
    executeAction,
  };
}

// Specialized hook for form undo/redo
export interface UseFormUndoRedoOptions<T> extends UseUndoRedoOptions {
  excludeFields?: (keyof T)[];
  onUndo?: (previousValue: T, currentValue: T) => void;
  onRedo?: (nextValue: T, currentValue: T) => void;
}

export function useFormUndoRedo<T extends Record<string, any>>(
  initialFormData: T,
  options: UseFormUndoRedoOptions<T> = {}
) {
  const { excludeFields = [], onUndo, onRedo, ...undoRedoOptions } = options;

  const undoRedo = useUndoRedo(initialFormData, undoRedoOptions);

  const updateField = useCallback((fieldName: keyof T, value: any) => {
    if (excludeFields.includes(fieldName)) {
      // Don't track excluded fields in undo/redo
      return;
    }

    const newFormData = {
      ...undoRedo.state,
      [fieldName]: value,
    };

    undoRedo.setState(
      newFormData,
      `update-${String(fieldName)}`,
      `Changed ${String(fieldName)} to ${value}`
    );
  }, [undoRedo, excludeFields]);

  const updateMultipleFields = useCallback((updates: Partial<T>) => {
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !excludeFields.includes(key as keyof T))
    );

    if (Object.keys(filteredUpdates).length === 0) {
      return;
    }

    const newFormData = {
      ...undoRedo.state,
      ...filteredUpdates,
    };

    undoRedo.setState(
      newFormData,
      'bulk-update',
      `Updated ${Object.keys(filteredUpdates).join(', ')}`
    );
  }, [undoRedo, excludeFields]);

  const resetForm = useCallback(() => {
    undoRedo.setState(
      initialFormData,
      'reset-form',
      'Reset form to initial values'
    );
  }, [undoRedo, initialFormData]);

  const customUndo = useCallback(() => {
    if (undoRedo.canUndo) {
      const currentValue = undoRedo.state;
      undoRedo.undo();
      onUndo?.(undoRedo.state, currentValue);
    }
  }, [undoRedo, onUndo]);

  const customRedo = useCallback(() => {
    if (undoRedo.canRedo) {
      const currentValue = undoRedo.state;
      undoRedo.redo();
      onRedo?.(undoRedo.state, currentValue);
    }
  }, [undoRedo, onRedo]);

  return {
    formData: undoRedo.state,
    updateField,
    updateMultipleFields,
    resetForm,
    undo: customUndo,
    redo: customRedo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    clearHistory: undoRedo.clearHistory,
    history: undoRedo.history,
  };
}

// Hook for list operations with undo/redo
export function useListUndoRedo<T>(
  initialList: T[],
  options: UseUndoRedoOptions = {}
) {
  const undoRedo = useUndoRedo(initialList, options);

  const addItem = useCallback((item: T, description?: string) => {
    const newList = [...undoRedo.state, item];
    undoRedo.setState(
      newList,
      'add-item',
      description || `Added item to list`
    );
  }, [undoRedo]);

  const removeItem = useCallback((index: number, description?: string) => {
    if (index < 0 || index >= undoRedo.state.length) {
      return;
    }

    const newList = undoRedo.state.filter((_, i) => i !== index);
    undoRedo.setState(
      newList,
      'remove-item',
      description || `Removed item from position ${index}`
    );
  }, [undoRedo]);

  const updateItem = useCallback((index: number, updatedItem: T, description?: string) => {
    if (index < 0 || index >= undoRedo.state.length) {
      return;
    }

    const newList = undoRedo.state.map((item, i) => (i === index ? updatedItem : item));
    undoRedo.setState(
      newList,
      'update-item',
      description || `Updated item at position ${index}`
    );
  }, [undoRedo]);

  const moveItem = useCallback((fromIndex: number, toIndex: number, description?: string) => {
    if (
      fromIndex < 0 || fromIndex >= undoRedo.state.length ||
      toIndex < 0 || toIndex >= undoRedo.state.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const newList = [...undoRedo.state];
    const [movedItem] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, movedItem);

    undoRedo.setState(
      newList,
      'move-item',
      description || `Moved item from position ${fromIndex} to ${toIndex}`
    );
  }, [undoRedo]);

  const setList = useCallback((newList: T[], description?: string) => {
    undoRedo.setState(
      newList,
      'set-list',
      description || 'Set list'
    );
  }, [undoRedo]);

  const clearList = useCallback((description?: string) => {
    undoRedo.setState(
      [],
      'clear-list',
      description || 'Cleared all items from list'
    );
  }, [undoRedo]);

  return {
    list: undoRedo.state,
    setList,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    clearList,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    clearHistory: undoRedo.clearHistory,
    history: undoRedo.history,
  };
}