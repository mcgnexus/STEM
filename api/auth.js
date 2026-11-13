import { send, methodNotAllowed } from '../lib/http.js';
import register from '../handlers/auth/register.js';
import login from '../handlers/auth/login.js';
import me from '../handlers/auth/me.js';

// POST /api/auth?action=register  |  POST /api/auth?action=login  |  GET /api/auth
export default async function handler(req, res) {
  const action = req.query.action;

  if (req.method === 'POST') {
    if (action === 'register') return register(req, res);
    if (action === 'login') return login(req, res);
    return send(res, 404, { error: 'Acción no encontrada' });
  }

  if (req.method === 'GET') return me(req, res);

  return methodNotAllowed(res, ['GET', 'POST']);
}
