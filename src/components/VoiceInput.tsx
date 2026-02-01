import { useState, useRef, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseInput, getPriorityLabel, getPriorityColor } from '../utils/dateParser';
import type { Priority } from '../types';

interface VoiceInputProps {
  onAddTodo: (text: string, dueDate?: Date, priority?: Priority, originalInput?: string, hasTime?: boolean) => void;
}

export function VoiceInput({ onAddTodo }: VoiceInputProps) {
  const [inputText, setInputText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasListeningRef = useRef(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  // Quando il riconoscimento termina, copia il transcript in inputText
  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript) {
      setInputText(transcript);
      setShowPreview(true);
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript]);

  const displayText = isListening
    ? (transcript || interimTranscript)
    : inputText;

  const parsed = parseInput(displayText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = isListening ? transcript : inputText;
    if (textToSubmit.trim()) {
      const result = parseInput(textToSubmit);
      onAddTodo(
        result.remainingText || textToSubmit.trim(),
        result.date || undefined,
        result.priority,
        textToSubmit,
        result.hasTime
      );
      setInputText('');
      resetTranscript();
      setShowPreview(false);
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
      if (transcript) {
        setInputText(transcript);
        setShowPreview(true);
      }
    } else {
      setInputText('');
      resetTranscript();
      startListening();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setShowPreview(e.target.value.length > 0);
  };

  const handleInputFocus = () => {
    setShowPreview(inputText.length > 0);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowPreview(false), 200);
  };

  const hasParsedInfo = parsed.date || parsed.priority !== 'none';

  return (
    <div className="voice-input-container">
      <form onSubmit={handleSubmit} className="voice-input-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={displayText}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={isListening ? 'Sto ascoltando...' : 'Aggiungi un task...'}
            className={`voice-input ${isListening ? 'listening' : ''}`}
            disabled={isListening}
          />

          <div className="input-buttons">
            {isSupported && (
              <button
                type="button"
                onClick={handleToggleListening}
                className={`voice-button ${isListening ? 'active' : ''}`}
                aria-label={isListening ? 'Ferma registrazione' : 'Inizia registrazione vocale'}
              >
                {isListening ? (
                  <div className="voice-waves">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={!displayText.trim()}
              aria-label="Aggiungi task"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {(showPreview || isListening) && displayText && hasParsedInfo && (
          <div className="input-preview">
            {parsed.remainingText && (
              <span className="preview-text">"{parsed.remainingText}"</span>
            )}

            {parsed.priority !== 'none' && (
              <span
                className="preview-priority"
                style={{
                  backgroundColor: getPriorityColor(parsed.priority) + '20',
                  color: getPriorityColor(parsed.priority)
                }}
              >
                {getPriorityLabel(parsed.priority)}
              </span>
            )}

            {parsed.date && (
              <span className="preview-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {parsed.date.toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}{parsed.hasTime && ` ${parsed.date.toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}`}
              </span>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className="voice-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {!isSupported && (
        <div className="voice-warning">
          Il riconoscimento vocale non è supportato in questo browser.
          Usa Chrome o Edge per questa funzionalità.
        </div>
      )}
    </div>
  );
}
