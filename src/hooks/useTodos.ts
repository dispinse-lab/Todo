import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Todo, Priority } from '../types';

const SYNC_CODE_KEY = 'voice-todos-sync-code';
const LOCAL_STORAGE_KEY = 'voice-todos';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateSyncCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

function getSyncCode(): string | null {
  return localStorage.getItem(SYNC_CODE_KEY);
}

function setSyncCode(code: string): void {
  localStorage.setItem(SYNC_CODE_KEY, code);
}

// Fallback to localStorage if Firebase is not configured
function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
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

// Serialize todos for Firestore (Dates -> ISO strings)
function serializeTodos(todos: Todo[]): object[] {
  return todos.map(todo => ({
    ...todo,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    createdAt: todo.createdAt.toISOString()
  }));
}

// Deserialize todos from Firestore (ISO strings -> Dates)
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

  const useFirebase = isFirebaseConfigured() && syncCode;

  // Load todos and set up real-time listener
  useEffect(() => {
    if (!useFirebase) {
      // Use localStorage
      setTodos(loadLocalTodos());
      setIsLoading(false);
      return;
    }

    // Use Firestore with real-time sync
    const docRef = doc(db, 'todos', syncCode);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.todos) {
          setTodos(deserializeTodos(data.todos));
        }
      } else {
        setTodos([]);
      }
      setIsLoading(false);
      setIsSyncing(false);
    }, (error) => {
      console.error('Firestore error:', error);
      // Fallback to localStorage
      setTodos(loadLocalTodos());
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [useFirebase, syncCode]);

  // Save to Firestore or localStorage when todos change
  useEffect(() => {
    if (isLoading) return;

    if (useFirebase) {
      setIsSyncing(true);
      const docRef = doc(db, 'todos', syncCode!);
      setDoc(docRef, {
        todos: serializeTodos(todos),
        updatedAt: new Date().toISOString()
      }).then(() => {
        setIsSyncing(false);
      }).catch((error) => {
        console.error('Error saving to Firestore:', error);
        setIsSyncing(false);
      });
    } else {
      saveLocalTodos(todos);
    }
  }, [todos, useFirebase, syncCode, isLoading]);

  const createSyncCode = useCallback(async () => {
    const code = generateSyncCode();
    setSyncCode(code);
    setSyncCodeState(code);

    if (isFirebaseConfigured()) {
      // Migrate local todos to Firestore
      const localTodos = loadLocalTodos();
      if (localTodos.length > 0) {
        const docRef = doc(db, 'todos', code);
        await setDoc(docRef, {
          todos: serializeTodos(localTodos),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return code;
  }, []);

  const useSyncCode = useCallback(async (code: string) => {
    const normalizedCode = code.toUpperCase().trim();
    setSyncCode(normalizedCode);
    setSyncCodeState(normalizedCode);
    setIsLoading(true);

    if (isFirebaseConfigured()) {
      // Check if the code exists
      const docRef = doc(db, 'todos', normalizedCode);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        // Create empty document
        await setDoc(docRef, {
          todos: [],
          updatedAt: new Date().toISOString()
        });
      }
    }
  }, []);

  const disconnectSync = useCallback(() => {
    localStorage.removeItem(SYNC_CODE_KEY);
    setSyncCodeState(null);
    setTodos(loadLocalTodos());
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

  // Sort: incomplete first, then by manual order
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
    // Sync features
    syncCode,
    isLoading,
    isSyncing,
    isFirebaseConfigured: isFirebaseConfigured(),
    createSyncCode,
    useSyncCode,
    disconnectSync
  };
}
