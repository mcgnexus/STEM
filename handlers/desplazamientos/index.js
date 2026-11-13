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
      `SELECT * FROM desplazamientos WHERE taller_id = $1 ORDER BY id ASC`,
      [tallerId]
    );
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    const { taller_id, origen, destino, km, coste_por_km, medio } = await readBody(req);
    if (!taller_id) {
      return send(res, 400, { error: 'taller_id es obligatorio' });
    }
    const rows = await sql.query(
      `INSERT INTO desplazamientos (taller_id, origen, destino, km, coste_por_km, medio)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [taller_id, origen || null, destino || null, km ?? 0, coste_por_km ?? 0, medio || null]
    );
    return send(res, 201, rows[0]);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default requireAuth(handler);
