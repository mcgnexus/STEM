import { getDb } from '../../lib/db.js';
import { hashPassword, signToken } from '../../lib/auth.js';
import { send, readBody, methodNotAllowed, handleError } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { email, password, nombre, rol } = await readBody(req);

    if (!email || !password || !nombre) {
      return send(res, 400, { error: 'email, password y nombre son obligatorios' });
    }
    if (password.length < 6) {
      return send(res, 400, { error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const role = rol === 'admin' ? 'admin' : 'monitor';
    const pwHash = await hashPassword(password);
    const sql = getDb();

    const rows = await sql.query(
      `INSERT INTO usuarios (email, nombre, password, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nombre, rol`,
      [email.toLowerCase().trim(), nombre.trim(), pwHash, role]
    );

    const user = rows[0];
    return send(res, 201, { token: signToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      return send(res, 409, { error: 'Ese email ya está registrado' });
    }
    return handleError(res, err);
  }
}
