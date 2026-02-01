import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();
const TODOS_KEY = 'voice-todos';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET': {
        const todos = await redis.get(TODOS_KEY) || [];
        return res.status(200).json(todos);
      }

      case 'POST': {
        const todos = (await redis.get(TODOS_KEY) || []) as Array<unknown>;
        const newTodo = req.body;
        todos.unshift(newTodo);
        await redis.set(TODOS_KEY, todos);
        return res.status(201).json(newTodo);
      }

      case 'PUT': {
        const todos = (await redis.get(TODOS_KEY) || []) as Array<{ id: string }>;
        const { id, ...updates } = req.body;
        const index = todos.findIndex(t => t.id === id);
        if (index !== -1) {
          todos[index] = { ...todos[index], ...updates };
          await redis.set(TODOS_KEY, todos);
          return res.status(200).json(todos[index]);
        }
        return res.status(404).json({ error: 'Todo not found' });
      }

      case 'DELETE': {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'ID required' });
        }
        const todos = (await redis.get(TODOS_KEY) || []) as Array<{ id: string }>;
        const filtered = todos.filter(t => t.id !== id);
        await redis.set(TODOS_KEY, filtered);
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
