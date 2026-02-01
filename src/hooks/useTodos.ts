import { useState, useEffect, useCallback, useRef } from 'react';
import type { Todo, Priority } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { signInAnonymousUser, subscribeToAuthState } from '../services/authService';
import {
  saveTodo,
  deleteTodoFromCloud,
  batchUpdateTodos,
  batchDeleteTodos,
  subscribeTodos,
  syncLocalTodosToCloud,
  isCloudSyncAvailable
} from '../services/todoService';

const STORAGE_KEY = 'voice-todos';
const SYNC_STATUS_KEY = 'voice-todos-synced';

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadTodosFromLocal(): Todo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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

function saveTodosToLocal(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Errore nel salvataggio dei todos:', e);
  }
}

function hasLocalTodosBeenSynced(): boolean {
  return localStorage.getItem(SYNC_STATUS_KEY) === 'true';
}

function markLocalTodosAsSynced(): void {
  localStorage.setItem(SYNC_STATUS_KEY, 'true');
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadTodosFromLocal);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isFirebaseConfigured() ? 'syncing' : 'offline'
  );
  const [userId, setUserId] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize authentication and cloud sync
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    if (!isFirebaseConfigured()) {
      setSyncStatus('offline');
      return;
    }

    // Subscribe to auth state
    const unsubscribeAuth = subscribeToAuthState(async (state) => {
      if (state.userId) {
        setUserId(state.userId);
      }
    });

    // Attempt anonymous sign-in
    signInAnonymousUser().then((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setSyncStatus('offline');
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Subscribe to Firestore updates when userId is available
  useEffect(() => {
    if (!userId || !isCloudSyncAvailable()) return;

    setSyncStatus('syncing');

    // If local todos exist and haven't been synced, sync them first
    const localTodos = loadTodosFromLocal();
    if (localTodos.length > 0 && !hasLocalTodosBeenSynced()) {
      syncLocalTodosToCloud(userId, localTodos).then(() => {
        markLocalTodosAsSynced();
      }).catch((error) => {
        console.error('Failed to sync local todos to cloud:', error);
      });
    }

    // Subscribe to real-time updates
    unsubscribeRef.current = subscribeTodos(
      userId,
      (cloudTodos) => {
        setTodos(cloudTodos);
        saveTodosToLocal(cloudTodos); // Keep local storage as cache
        setSyncStatus('synced');
      },
      (error) => {
        console.error('Cloud sync error:', error);
        setSyncStatus('error');
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId]);

  // Save to local storage as fallback (when cloud sync is not available)
  useEffect(() => {
    if (!isCloudSyncAvailable()) {
      saveTodosToLocal(todos);
    }
  }, [todos]);

  const addTodo = useCallback(async (
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

    // Sync to cloud
    if (userId && isCloudSyncAvailable()) {
      setSyncStatus('syncing');
      try {
        await saveTodo(userId, newTodo);
        setSyncStatus('synced');
      } catch (error) {
        console.error('Failed to save todo to cloud:', error);
        setSyncStatus('error');
        saveTodosToLocal([newTodo, ...todos]); // Fallback to local
      }
    }

    return newTodo;
  }, [userId, todos]);

  const toggleTodo = useCallback(async (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);

    // Sync to cloud
    if (userId && isCloudSyncAvailable()) {
      const updatedTodo = updatedTodos.find(t => t.id === id);
      if (updatedTodo) {
        setSyncStatus('syncing');
        try {
          await saveTodo(userId, updatedTodo);
          setSyncStatus('synced');
        } catch (error) {
          console.error('Failed to update todo in cloud:', error);
          setSyncStatus('error');
        }
      }
    }
  }, [userId, todos]);

  const deleteTodo = useCallback(async (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));

    // Sync to cloud
    if (userId && isCloudSyncAvailable()) {
      setSyncStatus('syncing');
      try {
        await deleteTodoFromCloud(userId, id);
        setSyncStatus('synced');
      } catch (error) {
        console.error('Failed to delete todo from cloud:', error);
        setSyncStatus('error');
      }
    }
  }, [userId]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, ...updates } : todo
    );
    setTodos(updatedTodos);

    // Sync to cloud
    if (userId && isCloudSyncAvailable()) {
      const updatedTodo = updatedTodos.find(t => t.id === id);
      if (updatedTodo) {
        setSyncStatus('syncing');
        try {
          await saveTodo(userId, updatedTodo);
          setSyncStatus('synced');
        } catch (error) {
          console.error('Failed to update todo in cloud:', error);
          setSyncStatus('error');
        }
      }
    }
  }, [userId, todos]);

  const clearCompleted = useCallback(async () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id);
    setTodos(prev => prev.filter(todo => !todo.completed));

    // Sync to cloud
    if (userId && isCloudSyncAvailable() && completedIds.length > 0) {
      setSyncStatus('syncing');
      try {
        await batchDeleteTodos(userId, completedIds);
        setSyncStatus('synced');
      } catch (error) {
        console.error('Failed to delete completed todos from cloud:', error);
        setSyncStatus('error');
      }
    }
  }, [userId, todos]);

  const reorderTodos = useCallback(async (fromIndex: number, toIndex: number) => {
    const result = [...todos];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    const reorderedTodos = result.map((todo, index) => ({ ...todo, order: index }));
    setTodos(reorderedTodos);

    // Sync to cloud
    if (userId && isCloudSyncAvailable()) {
      setSyncStatus('syncing');
      try {
        await batchUpdateTodos(userId, reorderedTodos);
        setSyncStatus('synced');
      } catch (error) {
        console.error('Failed to reorder todos in cloud:', error);
        setSyncStatus('error');
      }
    }
  }, [userId, todos]);

  // Sort todos (completed at the bottom)
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
    syncStatus,
    isCloudEnabled: isCloudSyncAvailable()
  };
}
