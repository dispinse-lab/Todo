import { useState, useEffect, useCallback, useRef } from 'react';
import { isSyncConfigured, loadFromServer, saveToServer, createSyncBin } from '../lib/syncService';
import type { Todo, Priority } from '../types';

const SYNC_CODE_KEY = 'voice-todos-sync-code';
const LOCAL_STORAGE_KEY = 'voice-todos';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getSyncCode(): string | null {
  return localStorage.getItem(SYNC_CODE_KEY);
}

function setSyncCodeStorage(code: string): void {
  localStorage.setItem(SYNC_CODE_KEY, code);
}

function loadLocalTodos(): Todo[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((todo: Todo) => ({
        ...todo,
        priority: todo.priority || 'none',
        dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
        createdAt: new Date(todo.createdAt)
      }));
    }
  } catch (e) {
    console.error('Errore nel caricamento dei todos:', e);
  }
  return [];
}

function saveLocalTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Errore nel salvataggio dei todos:', e);
  }
}

function serializeTodos(todos: Todo[]): object[] {
  return todos.map(todo => ({
    ...todo,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    createdAt: todo.createdAt.toISOString()
  }));
}

function deserializeTodos(data: object[]): Todo[] {
  return data.map((todo: any) => ({
    ...todo,
    priority: todo.priority || 'none',
    dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
    createdAt: new Date(todo.createdAt)
  }));
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [syncCode, setSyncCodeState] = useState<string | null>(getSyncCode());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncRef = useRef<string>('');

  const canSync = isSyncConfigured() && syncCode;

  // Load todos on mount
  useEffect(() => {
    const loadTodos = async () => {
      // Always load local first
      const localTodos = loadLocalTodos();
      setTodos(localTodos);

      // Then try to sync from server
      if (canSync) {
        const serverData = await loadFromServer(syncCode);
        if (serverData?.todos) {
          const serverTodos = deserializeTodos(serverData.todos);
          setTodos(serverTodos);
          saveLocalTodos(serverTodos);
        }
      }
      setIsLoading(false);
    };

    loadTodos();
  }, [canSync, syncCode]);

  // Sync to server when todos change
  useEffect(() => {
    if (isLoading) return;

    // Always save locally
    saveLocalTodos(todos);

    // Sync to server if connected
    if (canSync) {
      const serialized = JSON.stringify(todos);
      if (serialized !== lastSyncRef.current) {
        lastSyncRef.current = serialized;
        setIsSyncing(true);
        saveToServer(syncCode, {
          todos: serializeTodos(todos),
          updatedAt: new Date().toISOString()
        }).finally(() => {
          setIsSyncing(false);
        });
      }
    }
  }, [todos, canSync, syncCode, isLoading]);

  // Poll for updates every 30 seconds when syncing
  useEffect(() => {
    if (!canSync) return;

    const interval = setInterval(async () => {
      const serverData = await loadFromServer(syncCode);
      if (serverData?.todos) {
        const serverTodos = deserializeTodos(serverData.todos);
        const serverSerialized = JSON.stringify(serverTodos);
        if (serverSerialized !== lastSyncRef.current) {
          lastSyncRef.current = serverSerialized;
          setTodos(serverTodos);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [canSync, syncCode]);

  const createSyncCode = useCallback(async () => {
    const binId = await createSyncBin();
    if (binId) {
      setSyncCodeStorage(binId);
      setSyncCodeState(binId);

      // Upload current todos to new bin
      const currentTodos = loadLocalTodos();
      if (currentTodos.length > 0) {
        await saveToServer(binId, {
          todos: serializeTodos(currentTodos),
          updatedAt: new Date().toISOString()
        });
      }

      return binId;
    }
    return null;
  }, []);

  const useSyncCode = useCallback(async (code: string) => {
    const normalizedCode = code.trim();
    setSyncCodeStorage(normalizedCode);
    setSyncCodeState(normalizedCode);
    setIsLoading(true);

    // Try to load from server
    const serverData = await loadFromServer(normalizedCode);
    if (serverData?.todos) {
      const serverTodos = deserializeTodos(serverData.todos);
      setTodos(serverTodos);
      saveLocalTodos(serverTodos);
    }
    setIsLoading(false);
  }, []);

  const disconnectSync = useCallback(() => {
    localStorage.removeItem(SYNC_CODE_KEY);
    setSyncCodeState(null);
  }, []);

  const addTodo = useCallback((
    text: string,
    dueDate?: Date,
    priority: Priority = 'none',
    originalInput?: string,
    hasTime?: boolean
  ) => {
    const newTodo: Todo = {
      id: generateId(),
      text,
      completed: false,
      dueDate,
      hasTime,
      priority,
      createdAt: new Date(),
      originalInput: originalInput || text,
      order: Date.now()
    };
    setTodos(prev => [newTodo, ...prev]);
    return newTodo;
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setTodos(prev => prev.filter(todo => !todo.completed));
  }, []);

  const reorderTodos = useCallback((fromIndex: number, toIndex: number) => {
    setTodos(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result.map((todo, index) => ({ ...todo, order: index }));
    });
  }, []);

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const pendingCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  return {
    todos: sortedTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    reorderTodos,
    pendingCount,
    completedCount,
    syncCode,
    isLoading,
    isSyncing,
    isSyncConfigured: isSyncConfigured(),
    createSyncCode,
    useSyncCode,
    disconnectSync
  };
}
