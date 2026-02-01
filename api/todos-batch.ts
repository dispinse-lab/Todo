import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();
const TODOS_KEY = 'voice-todos';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    switch (action) {
      case 'clear-completed': {
        const todos = (await redis.get(TODOS_KEY) || []) as Array<{ completed: boolean }>;
        const filtered = todos.filter(t => !t.completed);
        await redis.set(TODOS_KEY, filtered);
        return res.status(200).json(filtered);
      }

      case 'reorder': {
        const { todos } = data;
        await redis.set(TODOS_KEY, todos);
        return res.status(200).json(todos);
      }

      case 'sync': {
        // Riceve tutti i todos e li salva (per sync iniziale da localStorage)
        const { todos } = data;
        await redis.set(TODOS_KEY, todos);
        return res.status(200).json(todos);
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
