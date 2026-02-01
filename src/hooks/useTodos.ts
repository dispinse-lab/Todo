import { useState, useEffect, useCallback } from 'react';
import type { Todo, Priority } from '../types';

const STORAGE_KEY = 'voice-todos';
const API_BASE = '/api';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// localStorage per cache locale e fallback offline
function loadFromStorage(): Todo[] {
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
    console.error('Errore nel caricamento locale:', e);
  }
  return [];
}

function saveToStorage(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Errore nel salvataggio locale:', e);
  }
}

// Converte date per JSON
function serializeTodo(todo: Todo): Record<string, unknown> {
  return {
    ...todo,
    dueDate: todo.dueDate?.toISOString() || null,
    createdAt: todo.createdAt.toISOString()
  };
}

// Converte da JSON a Todo
function deserializeTodo(data: Record<string, unknown>): Todo {
  return {
    id: data.id as string,
    text: data.text as string,
    completed: data.completed as boolean,
    dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined,
    hasTime: data.hasTime as boolean | undefined,
    priority: (data.priority as Priority) || 'none',
    createdAt: new Date(data.createdAt as string),
    originalInput: data.originalInput as string,
    order: data.order as number | undefined
  };
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadFromStorage);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Carica i todos dal server all'avvio
  useEffect(() => {
    async function fetchTodos() {
      try {
        const res = await fetch(`${API_BASE}/todos`);
        if (res.ok) {
          const data = await res.json();
          const serverTodos = (data as Record<string, unknown>[]).map(deserializeTodo);
          setTodos(serverTodos);
          saveToStorage(serverTodos);
          setIsOnline(true);
        } else {
          throw new Error('Fetch failed');
        }
      } catch (error) {
        console.warn('Modalità offline, uso localStorage:', error);
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    }
    fetchTodos();
  }, []);

  // Salva su localStorage quando i todos cambiano
  useEffect(() => {
    if (!loading) {
      saveToStorage(todos);
    }
  }, [todos, loading]);

  const syncToServer = useCallback(async (newTodos: Todo[]) => {
    try {
      await fetch(`${API_BASE}/todos-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          data: { todos: newTodos.map(serializeTodo) }
        })
      });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  }, []);

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

    setTodos(prev => {
      const updated = [newTodo, ...prev];
      syncToServer(updated);
      return updated;
    });

    return newTodo;
  }, [syncToServer]);

  const toggleTodo = useCallback(async (id: string) => {
    setTodos(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      syncToServer(updated);
      return updated;
    });
  }, [syncToServer]);

  const deleteTodo = useCallback(async (id: string) => {
    setTodos(prev => {
      const updated = prev.filter(t => t.id !== id);
      syncToServer(updated);
      return updated;
    });
  }, [syncToServer]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    setTodos(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      syncToServer(updated);
      return updated;
    });
  }, [syncToServer]);

  const clearCompleted = useCallback(async () => {
    setTodos(prev => {
      const updated = prev.filter(t => !t.completed);
      syncToServer(updated);
      return updated;
    });
  }, [syncToServer]);

  const reorderTodos = useCallback(async (fromIndex: number, toIndex: number) => {
    setTodos(prev => {
      const reordered = [...prev];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);
      const updated = reordered.map((todo, index) => ({ ...todo, order: index }));
      syncToServer(updated);
      return updated;
    });
  }, [syncToServer]);

  // Ordina i todos (non completati prima, poi per ordine)
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
    loading,
    isOnline,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    reorderTodos,
    pendingCount,
    completedCount
  };
}
