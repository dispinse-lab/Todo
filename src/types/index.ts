export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
  originalInput: string;
}

export interface ParsedDateTime {
  date: Date | null;
  remainingText: string;
  confidence: number;
}
