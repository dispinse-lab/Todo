import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Todo, Priority } from '../types';

const STORAGE_KEY = 'voice-todos';
const TODOS_COLLECTION = 'todos';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Converte un documento Firestore in Todo
function firestoreToTodo(doc: { id: string; data: () => Record<string, unknown> }): Todo {
  const data = doc.data();
  return {
    id: doc.id,
    text: data.text as string,
    completed: data.completed as boolean,
    dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
    hasTime: data.hasTime as boolean | undefined,
    priority: (data.priority as Priority) || 'none',
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
    originalInput: data.originalInput as string,
    order: data.order as number | undefined
  };
}

// Converte un Todo in formato Firestore
function todoToFirestore(todo: Partial<Todo>, userId: string): Record<string, unknown> {
  const data: Record<string, unknown> = { userId };

  if (todo.text !== undefined) data.text = todo.text;
  if (todo.completed !== undefined) data.completed = todo.completed;
  if (todo.dueDate !== undefined) data.dueDate = todo.dueDate ? Timestamp.fromDate(todo.dueDate) : null;
  if (todo.hasTime !== undefined) data.hasTime = todo.hasTime;
  if (todo.priority !== undefined) data.priority = todo.priority;
  if (todo.createdAt !== undefined) data.createdAt = Timestamp.fromDate(todo.createdAt);
  if (todo.originalInput !== undefined) data.originalInput = todo.originalInput;
  if (todo.order !== undefined) data.order = todo.order;

  return data;
}

// Funzioni localStorage per fallback quando non autenticato
function loadTodosFromStorage(): Todo[] {
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

function saveTodosToStorage(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Errore nel salvataggio dei todos:', e);
  }
}

export function useTodos(userId?: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  // Effetto per caricare i todos
  useEffect(() => {
    if (!userId) {
      // Modalità locale (non autenticato)
      setTodos(loadTodosFromStorage());
      setLoading(false);
      return;
    }

    // Modalità cloud (autenticato)
    setLoading(true);
    const q = query(
      collection(db, TODOS_COLLECTION),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTodos = snapshot.docs.map(firestoreToTodo);
      setTodos(loadedTodos);
      setLoading(false);
    }, (error) => {
      console.error('Errore nel caricamento dei todos:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Salva su localStorage quando non autenticato
  useEffect(() => {
    if (!userId && !loading) {
      saveTodosToStorage(todos);
    }
  }, [todos, userId, loading]);

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

    if (!userId) {
      // Modalità locale
      setTodos(prev => [newTodo, ...prev]);
      return newTodo;
    }

    // Modalità cloud
    try {
      const docRef = await addDoc(collection(db, TODOS_COLLECTION), todoToFirestore(newTodo, userId));
      newTodo.id = docRef.id;
    } catch (error) {
      console.error('Errore nell\'aggiunta del todo:', error);
    }
    return newTodo;
  }, [userId]);

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    if (!userId) {
      // Modalità locale
      setTodos(prev =>
        prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
      return;
    }

    // Modalità cloud
    try {
      await updateDoc(doc(db, TODOS_COLLECTION, id), {
        completed: !todo.completed
      });
    } catch (error) {
      console.error('Errore nel toggle del todo:', error);
    }
  }, [userId, todos]);

  const deleteTodo = useCallback(async (id: string) => {
    if (!userId) {
      // Modalità locale
      setTodos(prev => prev.filter(todo => todo.id !== id));
      return;
    }

    // Modalità cloud
    try {
      await deleteDoc(doc(db, TODOS_COLLECTION, id));
    } catch (error) {
      console.error('Errore nell\'eliminazione del todo:', error);
    }
  }, [userId]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    if (!userId) {
      // Modalità locale
      setTodos(prev =>
        prev.map(todo => todo.id === id ? { ...todo, ...updates } : todo)
      );
      return;
    }

    // Modalità cloud
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.text !== undefined) updateData.text = updates.text;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? Timestamp.fromDate(updates.dueDate) : null;
      if (updates.hasTime !== undefined) updateData.hasTime = updates.hasTime;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.originalInput !== undefined) updateData.originalInput = updates.originalInput;
      if (updates.order !== undefined) updateData.order = updates.order;

      await updateDoc(doc(db, TODOS_COLLECTION, id), updateData);
    } catch (error) {
      console.error('Errore nell\'aggiornamento del todo:', error);
    }
  }, [userId]);

  const clearCompleted = useCallback(async () => {
    const completedTodos = todos.filter(t => t.completed);

    if (!userId) {
      // Modalità locale
      setTodos(prev => prev.filter(todo => !todo.completed));
      return;
    }

    // Modalità cloud - usa batch per eliminare tutti
    try {
      const batch = writeBatch(db);
      completedTodos.forEach(todo => {
        batch.delete(doc(db, TODOS_COLLECTION, todo.id));
      });
      await batch.commit();
    } catch (error) {
      console.error('Errore nella pulizia dei completati:', error);
    }
  }, [userId, todos]);

  const reorderTodos = useCallback(async (fromIndex: number, toIndex: number) => {
    const reordered = [...todos];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const updatedTodos = reordered.map((todo, index) => ({ ...todo, order: index }));

    if (!userId) {
      // Modalità locale
      setTodos(updatedTodos);
      return;
    }

    // Modalità cloud - aggiorna gli ordini con batch
    try {
      const batch = writeBatch(db);
      updatedTodos.forEach((todo, index) => {
        batch.update(doc(db, TODOS_COLLECTION, todo.id), { order: index });
      });
      await batch.commit();
    } catch (error) {
      console.error('Errore nel riordinamento:', error);
    }
  }, [userId, todos]);

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
