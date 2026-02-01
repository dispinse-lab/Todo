import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { Todo, Priority } from '../types';

// Firestore document structure (dates stored as Timestamps)
interface TodoDocument {
  id: string;
  text: string;
  completed: boolean;
  dueDate: Timestamp | null;
  hasTime: boolean;
  priority: Priority;
  createdAt: Timestamp;
  originalInput: string;
  order: number;
  updatedAt: Timestamp;
}

// Convert Todo to Firestore document
function todoToDocument(todo: Todo): TodoDocument {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    dueDate: todo.dueDate ? Timestamp.fromDate(todo.dueDate) : null,
    hasTime: todo.hasTime || false,
    priority: todo.priority,
    createdAt: Timestamp.fromDate(todo.createdAt),
    originalInput: todo.originalInput,
    order: todo.order ?? Date.now(),
    updatedAt: Timestamp.now()
  };
}

// Convert Firestore document to Todo
function documentToTodo(doc: TodoDocument): Todo {
  return {
    id: doc.id,
    text: doc.text,
    completed: doc.completed,
    dueDate: doc.dueDate ? doc.dueDate.toDate() : undefined,
    hasTime: doc.hasTime,
    priority: doc.priority,
    createdAt: doc.createdAt.toDate(),
    originalInput: doc.originalInput,
    order: doc.order
  };
}

// Get the todos collection reference for a user
function getTodosCollection(userId: string) {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, 'users', userId, 'todos');
}

// Add or update a todo
export async function saveTodo(userId: string, todo: Todo): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  const todosRef = getTodosCollection(userId);
  const todoDoc = doc(todosRef, todo.id);
  await setDoc(todoDoc, todoToDocument(todo));
}

// Delete a todo
export async function deleteTodoFromCloud(userId: string, todoId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  const todosRef = getTodosCollection(userId);
  const todoDoc = doc(todosRef, todoId);
  await deleteDoc(todoDoc);
}

// Batch update multiple todos (efficient for reordering)
export async function batchUpdateTodos(userId: string, todos: Todo[]): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  const batch = writeBatch(db);
  const todosRef = getTodosCollection(userId);

  todos.forEach((todo) => {
    const todoDoc = doc(todosRef, todo.id);
    batch.set(todoDoc, todoToDocument(todo));
  });

  await batch.commit();
}

// Delete multiple todos (for clearing completed)
export async function batchDeleteTodos(userId: string, todoIds: string[]): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  const batch = writeBatch(db);
  const todosRef = getTodosCollection(userId);

  todoIds.forEach((id) => {
    const todoDoc = doc(todosRef, id);
    batch.delete(todoDoc);
  });

  await batch.commit();
}

// Subscribe to real-time updates
export function subscribeTodos(
  userId: string,
  callback: (todos: Todo[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured() || !db) {
    return () => {};
  }

  const todosRef = getTodosCollection(userId);
  const q = query(todosRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const todos: Todo[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as TodoDocument;
        todos.push(documentToTodo(data));
      });
      callback(todos);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      onError?.(error);
    }
  );
}

// Sync local todos to cloud (for initial migration)
export async function syncLocalTodosToCloud(userId: string, localTodos: Todo[]): Promise<void> {
  if (!isFirebaseConfigured() || !db || localTodos.length === 0) return;

  await batchUpdateTodos(userId, localTodos);
}

// Check if cloud sync is available
export function isCloudSyncAvailable(): boolean {
  return isFirebaseConfigured() && db !== null;
}
