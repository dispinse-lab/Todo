export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  priority: Priority;
  createdAt: Date;
  originalInput: string;
}

export interface ParsedInput {
  date: Date | null;
  priority: Priority;
  remainingText: string;
}
