import { useState } from 'react';
import type { Todo, Priority } from '../types';
import { formatDateTime, isOverdue, getPriorityLabel, getPriorityColor } from '../utils/dateParser';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
}

const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high', 'urgent'];

export function TodoItem({ todo, onToggle, onDelete, onUpdate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const overdue = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);
  const priorityColor = getPriorityColor(todo.priority);
  const priorityLabel = getPriorityLabel(todo.priority);

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onUpdate(todo.id, { text: editText.trim() });
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  const handlePriorityChange = (priority: Priority) => {
    onUpdate(todo.id, { priority });
    setShowPriorityMenu(false);
  };

  return (
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
      style={{ borderLeftColor: priorityColor, borderLeftWidth: todo.priority !== 'none' ? '4px' : '0' }}
    >
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
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="todo-edit-input"
            autoFocus
          />
        ) : (
          <span
            className="todo-text"
            onDoubleClick={() => setIsEditing(true)}
            title="Doppio click per modificare"
          >
            {todo.text}
          </span>
        )}

        <div className="todo-meta">
          {todo.dueDate && (
            <span className={`todo-date ${overdue ? 'overdue' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDateTime(todo.dueDate)}
            </span>
          )}

          {todo.priority !== 'none' && (
            <span
              className="todo-priority"
              style={{ backgroundColor: priorityColor + '20', color: priorityColor }}
            >
              {priorityLabel}
            </span>
          )}
        </div>
      </div>

      <div className="todo-actions">
        {/* Priority button */}
        <div className="priority-dropdown">
          <button
            className="todo-action-btn"
            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            aria-label="Cambia priorità"
            title="Cambia priorità"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>

          {showPriorityMenu && (
            <div className="priority-menu">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  className={`priority-option ${todo.priority === p ? 'active' : ''}`}
                  onClick={() => handlePriorityChange(p)}
                  style={{
                    borderLeftColor: getPriorityColor(p),
                    borderLeftWidth: p !== 'none' ? '3px' : '0'
                  }}
                >
                  {p === 'none' ? 'Nessuna' : getPriorityLabel(p)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit button */}
        <button
          className="todo-action-btn"
          onClick={() => setIsEditing(true)}
          aria-label="Modifica task"
          title="Modifica"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          className="todo-action-btn delete"
          onClick={() => onDelete(todo.id)}
          aria-label="Elimina task"
          title="Elimina"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
