import { getUser } from './auth.js';

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  send(res, 405, { error: 'Método no permitido' });
}

export async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Envuelve un handler exigiendo autenticación. Devuelve el usuario en ctx.user.
export function requireAuth(handler) {
  return async (req, res) => {
    const user = getUser(req);
    if (!user) {
      return send(res, 401, { error: 'No autenticado' });
    }
    try {
      return await handler(req, res, { user });
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: err.message || 'Error interno' });
    }
  };
}

export function handleError(res, err) {
  console.error(err);
  send(res, 500, { error: err.message || 'Error interno' });
}
