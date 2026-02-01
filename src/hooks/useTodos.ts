import { useState, useEffect, useCallback } from 'react';
import type { Todo, Priority } from '../types';

const STORAGE_KEY = 'voice-todos';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadTodos(): Todo[] {
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

function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Errore nel salvataggio dei todos:', e);
  }
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

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
      order: Date.now() // ordine iniziale basato sul timestamp
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
      // Aggiorna l'ordine per tutti i task
      return result.map((todo, index) => ({ ...todo, order: index }));
    });
  }, []);

  // Mantiene l'ordine manuale (i completati vanno in fondo)
  const sortedTodos = [...todos].sort((a, b) => {
    // Prima i non completati
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Poi per ordine manuale se presente
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // Fallback: per data di creazione (più recenti prima)
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
    completedCount
  };
}
