import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    const rows = await sql.query(
      `SELECT * FROM centros_educativos ORDER BY nombre ASC`
    );
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    const { nombre, contacto, email, telefono } = await readBody(req);
    if (!nombre) return send(res, 400, { error: 'El nombre es obligatorio' });

    const rows = await sql.query(
      `INSERT INTO centros_educativos (nombre, contacto, email, telefono)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), contacto || null, email || null, telefono || null]
    );
    return send(res, 201, rows[0]);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default requireAuth(handler);
