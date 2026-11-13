import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res, { user }) {
  const sql = getDb();

  if (req.method === 'GET') {
    const tallerId = Number(req.query.taller_id);
    if (!Number.isInteger(tallerId)) {
      return send(res, 400, { error: 'taller_id es obligatorio' });
    }
    const rows = await sql.query(
      `SELECT h.*, u.nombre AS monitor_nombre
       FROM horas_trabajo h
       LEFT JOIN usuarios u ON u.id = h.monitor_id
       WHERE h.taller_id = $1 ORDER BY h.fecha ASC NULLS LAST, h.id ASC`,
      [tallerId]
    );
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    const { taller_id, monitor_id, fecha, horas, tarifa_hora } = await readBody(req);
    if (!taller_id) {
      return send(res, 400, { error: 'taller_id es obligatorio' });
    }
    const rows = await sql.query(
      `INSERT INTO horas_trabajo (taller_id, monitor_id, fecha, horas, tarifa_hora)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [taller_id, monitor_id || user.sub, fecha || null, horas ?? 0, tarifa_hora ?? 0]
    );
    return send(res, 201, rows[0]);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default requireAuth(handler);
