import { useState, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseDateTimeItalian } from '../utils/dateParser';

interface VoiceInputProps {
  onAddTodo: (text: string, dueDate?: Date, originalInput?: string) => void;
}

export function VoiceInput({ onAddTodo }: VoiceInputProps) {
  const [inputText, setInputText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Mostra: testo digitato OPPURE testo vocale (mai entrambi)
  const displayText = isListening
    ? (transcript || interimTranscript)
    : inputText;

  const parsed = parseDateTimeItalian(displayText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = isListening ? transcript : inputText;
    if (textToSubmit.trim()) {
      const result = parseDateTimeItalian(textToSubmit);
      onAddTodo(
        result.remainingText || textToSubmit.trim(),
        result.date || undefined,
        textToSubmit
      );
      setInputText('');
      resetTranscript();
      setShowPreview(false);
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
      // Copia il transcript nell'input quando si ferma
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
            placeholder={isListening ? 'Sto ascoltando...' : 'Aggiungi un task... (es. "Comprare il latte domani alle 10")'}
            className={`voice-input ${isListening ? 'listening' : ''}`}
            disabled={isListening}
          />

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

        {(showPreview || isListening) && displayText && parsed.date && (
          <div className="date-preview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>
              {parsed.remainingText && <strong>"{parsed.remainingText}"</strong>}
              {' '} - {parsed.date.toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })} alle {parsed.date.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
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
