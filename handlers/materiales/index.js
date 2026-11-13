import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    const tallerId = Number(req.query.taller_id);
    if (!Number.isInteger(tallerId)) {
      return send(res, 400, { error: 'taller_id es obligatorio' });
    }
    const rows = await sql.query(
      `SELECT * FROM materiales WHERE taller_id = $1 ORDER BY id ASC`,
      [tallerId]
    );
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    const { taller_id, item, cantidad, precio_unitario, proveedor } = await readBody(req);
    if (!taller_id || !item) {
      return send(res, 400, { error: 'taller_id e item son obligatorios' });
    }
    const rows = await sql.query(
      `INSERT INTO materiales (taller_id, item, cantidad, precio_unitario, proveedor)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [taller_id, item.trim(), cantidad ?? 1, precio_unitario ?? 0, proveedor || null]
    );
    return send(res, 201, rows[0]);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default requireAuth(handler);
