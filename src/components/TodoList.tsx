import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTodos } from '../hooks/useTodos';
import { VoiceInput } from './VoiceInput';
import { TodoItem } from './TodoItem';
import type { Todo } from '../types';

type FilterType = 'all' | 'pending' | 'completed';

// Wrapper per rendere ogni TodoItem sortable
function SortableTodoItem({ todo, onToggle, onDelete, onUpdate }: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TodoItem
        todo={todo}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function TodoList() {
  const {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    reorderTodos,
    pendingCount,
    completedCount,
    syncCode,
    isLoading,
    isSyncing,
    isSyncConfigured,
    createSyncCode,
    useSyncCode,
    disconnectSync
  } = useTodos();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [inputCode, setInputCode] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex(t => t.id === active.id);
      const newIndex = todos.findIndex(t => t.id === over.id);
      reorderTodos(oldIndex, newIndex);
    }
  };

  const handleCreateSync = async () => {
    const code = await createSyncCode();
    if (code) {
      setInputCode(code);
    }
  };

  const handleUseCode = async () => {
    if (inputCode.trim()) {
      await useSyncCode(inputCode.trim());
      setShowSyncPanel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="todo-list-container">
        <div className="loading-state">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="todo-list-container">
      <header className="app-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <h1>Voice Todo</h1>
        <button
          className={`sync-toggle-btn ${syncCode ? 'connected' : ''} ${isSyncing ? 'syncing' : ''}`}
          onClick={() => setShowSyncPanel(!showSyncPanel)}
          title={syncCode ? `Sincronizzato: ${syncCode}` : 'Sincronizza dispositivi'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </header>

      {showSyncPanel && (
        <div className="sync-panel">
          {!isSyncConfigured ? (
            <p className="sync-warning">Sync non configurato. I dati sono salvati solo localmente.</p>
          ) : syncCode ? (
            <>
              <p className="sync-info">Codice sync: <strong>{syncCode}</strong></p>
              <p className="sync-hint">Usa questo codice su altri dispositivi</p>
              <button className="sync-btn disconnect" onClick={disconnectSync}>Disconnetti</button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Inserisci codice..."
                className="sync-input"
                maxLength={8}
              />
              <div className="sync-actions">
                <button className="sync-btn" onClick={handleUseCode} disabled={!inputCode.trim()}>
                  Connetti
                </button>
                <button className="sync-btn primary" onClick={handleCreateSync}>
                  Nuovo codice
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <VoiceInput onAddTodo={addTodo} />

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tutti
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Da fare
        </button>
        <button
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Fatti
        </button>
      </div>

      <div className="todo-list">
        {filteredTodos.length === 0 ? (
          <div className="empty-state">
            {filter === 'all' ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
                <p>Nessun task ancora.</p>
                <span>Prova "Urgente comprare il pane domani alle 10"</span>
              </>
            ) : filter === 'pending' ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p>Tutto fatto!</p>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <p>Nessun task completato</p>
              </>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTodos.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredTodos.map(todo => (
                <SortableTodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onUpdate={updateTodo}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <footer className="app-footer">
        <span className="stats-text">{pendingCount} da fare · {completedCount} completati</span>
        {completedCount > 0 && (
          <button className="clear-completed-btn" onClick={clearCompleted}>
            Elimina completati
          </button>
        )}
      </footer>
    </div>
  );
}
