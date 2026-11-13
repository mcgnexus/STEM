import { getDb } from '../../lib/db.js';
import { verifyPassword, signToken } from '../../lib/auth.js';
import { send, readBody, methodNotAllowed, handleError } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { email, password } = await readBody(req);
    if (!email || !password) {
      return send(res, 400, { error: 'email y password son obligatorios' });
    }

    const sql = getDb();
    const rows = await sql.query(
      `SELECT id, email, nombre, rol, password FROM usuarios WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password))) {
      return send(res, 401, { error: 'Credenciales incorrectas' });
    }

    const { password: _omit, ...safeUser } = user;
    return send(res, 200, { token: signToken(safeUser), user: safeUser });
  } catch (err) {
    return handleError(res, err);
  }
}
