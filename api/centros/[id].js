import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return send(res, 400, { error: 'id inválido' });
  const sql = getDb();

  if (req.method === 'GET') {
    const rows = await sql.query(`SELECT * FROM centros_educativos WHERE id = $1`, [id]);
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'PUT') {
    const { nombre, contacto, email, telefono } = await readBody(req);
    const rows = await sql.query(
      `UPDATE centros_educativos
       SET nombre = COALESCE($1, nombre),
           contacto = $2, email = $3, telefono = $4
       WHERE id = $5 RETURNING *`,
      [nombre || null, contacto || null, email || null, telefono || null, id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    const rows = await sql.query(
      `DELETE FROM centros_educativos WHERE id = $1 RETURNING id`, [id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
}

export default requireAuth(handler);
