import type { SyncStatus as SyncStatusType } from '../hooks/useTodos';

interface SyncStatusProps {
  status: SyncStatusType;
  isCloudEnabled: boolean;
}

export function SyncStatus({ status, isCloudEnabled }: SyncStatusProps) {
  if (!isCloudEnabled) {
    return (
      <div className="sync-status sync-status--offline" title="Modalità offline - configura Firebase per la sincronizzazione">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span>Offline</span>
      </div>
    );
  }

  switch (status) {
    case 'syncing':
      return (
        <div className="sync-status sync-status--syncing" title="Sincronizzazione in corso...">
          <svg className="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>Sincronizzazione...</span>
        </div>
      );
    case 'synced':
      return (
        <div className="sync-status sync-status--synced" title="Sincronizzato con il cloud">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            <polyline points="9 15 12 12 15 15" />
            <line x1="12" y1="12" x2="12" y2="19" />
          </svg>
          <span>Sincronizzato</span>
        </div>
      );
    case 'error':
      return (
        <div className="sync-status sync-status--error" title="Errore di sincronizzazione - i dati sono salvati localmente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Errore sync</span>
        </div>
      );
    default:
      return (
        <div className="sync-status sync-status--offline" title="Modalità offline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            <line x1="22" y1="2" x2="2" y2="22" />
          </svg>
          <span>Offline</span>
        </div>
      );
  }
}
