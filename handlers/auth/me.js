import { requireAuth, send } from '../../lib/http.js';

async function handler(req, res, { user }) {
  return send(res, 200, {
    user: { id: user.sub, email: user.email, nombre: user.nombre, rol: user.rol },
  });
}

export default requireAuth(handler);
