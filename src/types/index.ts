export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  hasTime?: boolean; // true se è stato specificato un orario
  priority: Priority;
  createdAt: Date;
  originalInput: string;
  order?: number; // per ordinamento manuale
}

export interface ParsedInput {
  date: Date | null;
  hasTime: boolean; // true se è stato specificato un orario
  priority: Priority;
  remainingText: string;
}

// Tipo per Firestore (date come Timestamp)
export interface TodoFirestore {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date | null;
  hasTime?: boolean;
  priority: Priority;
  createdAt: Date;
  originalInput: string;
  order?: number;
  userId: string;
}
