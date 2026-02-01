// Simple JSON sync service using JSONBin.io (free, no setup required)
// Or can be replaced with any simple REST API

const API_URL = 'https://api.jsonbin.io/v3/b';
const MASTER_KEY = import.meta.env.VITE_JSONBIN_KEY;

interface SyncData {
  todos: object[];
  updatedAt: string;
}

export function isSyncConfigured(): boolean {
  return !!MASTER_KEY;
}

export async function loadFromServer(syncCode: string): Promise<SyncData | null> {
  if (!MASTER_KEY) return null;

  try {
    const response = await fetch(`${API_URL}/${syncCode}/latest`, {
      headers: {
        'X-Master-Key': MASTER_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.record as SyncData;
    }
    return null;
  } catch (error) {
    console.error('Error loading from server:', error);
    return null;
  }
}

export async function saveToServer(syncCode: string, data: SyncData): Promise<boolean> {
  if (!MASTER_KEY) return false;

  try {
    const response = await fetch(`${API_URL}/${syncCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      },
      body: JSON.stringify(data)
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving to server:', error);
    return false;
  }
}

export async function createSyncBin(): Promise<string | null> {
  if (!MASTER_KEY) return null;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Private': 'false'
      },
      body: JSON.stringify({
        todos: [],
        updatedAt: new Date().toISOString()
      })
    });

    if (response.ok) {
      const data = await response.json();
      // Return the bin ID (last part of the metadata.id)
      return data.metadata.id;
    }
    return null;
  } catch (error) {
    console.error('Error creating sync bin:', error);
    return null;
  }
}
