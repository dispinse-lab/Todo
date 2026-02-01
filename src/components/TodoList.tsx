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
    loading,
    isOnline,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    reorderTodos,
    pendingCount,
    completedCount
  } = useTodos();

  const [filter, setFilter] = useState<FilterType>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
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

  return (
    <div className="todo-list-container">
      <header className="app-header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Voice Todo
        </h1>
        <p className="app-subtitle">
          {isOnline ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sync-icon synced">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Sincronizzato
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sync-icon offline">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              Offline
            </>
          )}
        </p>
      </header>

      <VoiceInput onAddTodo={addTodo} />

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Caricamento...</p>
        </div>
      ) : (
        <>
          <div className="todo-stats">
            <div className="stat">
              <span className="stat-number">{pendingCount}</span>
              <span className="stat-label">da fare</span>
            </div>
            <div className="stat">
              <span className="stat-number">{completedCount}</span>
              <span className="stat-label">completati</span>
            </div>
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tutti ({todos.length})
            </button>
            <button
              className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Da fare ({pendingCount})
            </button>
            <button
              className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completati ({completedCount})
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
                    <span>Prova a dire "Urgente comprare il pane domani alle 10"</span>
                  </>
                ) : filter === 'pending' ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p>Tutto fatto!</p>
                    <span>Non hai task da completare</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <p>Nessun task completato</p>
                    <span>Completa qualche task per vederlo qui</span>
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

          {completedCount > 0 && (
            <button className="clear-completed" onClick={clearCompleted}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Elimina completati
            </button>
          )}
        </>
      )}

      <footer className="app-footer">
        <p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Tip: Prova "urgente", "priorità alta", "domani alle 15"
        </p>
      </footer>
    </div>
  );
}
