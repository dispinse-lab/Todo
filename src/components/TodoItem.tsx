import { useState } from 'react';
import type { Todo, Priority } from '../types';
import { formatDateTime, isOverdue, getPriorityLabel, getPriorityColor, parseInput } from '../utils/dateParser';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high', 'urgent'];

// Helper per convertire Date in formato date
function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate, dragHandleProps }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editDate, setEditDate] = useState(todo.dueDate ? toDateOnly(todo.dueDate) : '');
  const [editTime, setEditTime] = useState(
    todo.dueDate && todo.hasTime
      ? todo.dueDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })
      : ''
  );
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const overdue = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);
  const priorityColor = getPriorityColor(todo.priority);
  const priorityLabel = getPriorityLabel(todo.priority);

  const handleStartEdit = () => {
    setEditText(todo.text);
    setEditDate(todo.dueDate ? toDateOnly(todo.dueDate) : '');
    setEditTime(
      todo.dueDate && todo.hasTime
        ? todo.dueDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })
        : ''
    );
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      const parsed = parseInput(editText);
      const updates: Partial<Todo> = {
        text: parsed.remainingText || editText.trim()
      };

      // Se l'utente ha specificato una data nei campi, usa quella
      if (editDate) {
        const [year, month, day] = editDate.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        if (editTime) {
          const [hours, minutes] = editTime.split(':').map(Number);
          newDate.setHours(hours, minutes, 0, 0);
          updates.hasTime = true;
        } else {
          newDate.setHours(0, 0, 0, 0);
          updates.hasTime = false;
        }
        updates.dueDate = newDate;
      } else if (parsed.date) {
        // Usa la data dal parsing del testo
        updates.dueDate = parsed.date;
        updates.hasTime = parsed.hasTime;
      } else {
        // Rimuovi la data se l'utente ha cancellato
        updates.dueDate = undefined;
        updates.hasTime = false;
      }

      // Aggiorna priorità se riconosciuta nel testo
      if (parsed.priority !== 'none') {
        updates.priority = parsed.priority;
      }
      onUpdate(todo.id, updates);
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
      className={`todo-item ${todo.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${isEditing ? 'editing' : ''}`}
      style={{ borderLeftColor: priorityColor, borderLeftWidth: todo.priority !== 'none' ? '4px' : '0' }}
    >
      {/* Drag handle */}
      <div className="drag-handle" {...dragHandleProps}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="5" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="19" r="1" fill="currentColor" />
          <circle cx="15" cy="5" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="19" r="1" fill="currentColor" />
        </svg>
      </div>

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
          <div className="edit-form">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="todo-edit-input"
              placeholder="Testo del task"
              autoFocus
            />
            <div className="edit-datetime">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="edit-date-input"
              />
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="edit-time-input"
                placeholder="--:--"
              />
              {(editDate || editTime) && (
                <button
                  type="button"
                  className="clear-date-btn"
                  onClick={() => { setEditDate(''); setEditTime(''); }}
                  title="Rimuovi data/ora"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <div className="edit-actions">
              <button className="edit-save-btn" onClick={handleSaveEdit}>Salva</button>
              <button className="edit-cancel-btn" onClick={() => setIsEditing(false)}>Annulla</button>
            </div>
          </div>
        ) : (
          <span
            className="todo-text"
            onDoubleClick={handleStartEdit}
            title="Doppio click per modificare"
          >
            {todo.text}
          </span>
        )}

        {!isEditing && (
          <div className="todo-meta">
            {todo.dueDate && (
              <span className={`todo-date ${overdue ? 'overdue' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatDateTime(todo.dueDate, todo.hasTime)}
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
        )}
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
          onClick={handleStartEdit}
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
