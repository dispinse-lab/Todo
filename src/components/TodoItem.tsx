import type { Todo } from '../types';
import { formatDateTime, isOverdue } from '../utils/dateParser';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const overdue = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}>
      <button
        className="todo-checkbox"
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? 'Segna come non completato' : 'Segna come completato'}
      >
        {todo.completed ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </button>

      <div className="todo-content">
        <span className="todo-text">{todo.text}</span>
        {todo.dueDate && (
          <span className={`todo-date ${overdue ? 'overdue' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDateTime(todo.dueDate)}
          </span>
        )}
      </div>

      <button
        className="todo-delete"
        onClick={() => onDelete(todo.id)}
        aria-label="Elimina task"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
