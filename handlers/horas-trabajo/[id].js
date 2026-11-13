import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return send(res, 400, { error: 'id inválido' });
  const sql = getDb();

  if (req.method === 'PUT') {
    const { monitor_id, fecha, horas, tarifa_hora } = await readBody(req);
    const rows = await sql.query(
      `UPDATE horas_trabajo SET
         monitor_id = $1, fecha = $2,
         horas = COALESCE($3, horas),
         tarifa_hora = COALESCE($4, tarifa_hora)
       WHERE id = $5 RETURNING *`,
      [monitor_id || null, fecha || null, horas ?? null, tarifa_hora ?? null, id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    const rows = await sql.query(
      `DELETE FROM horas_trabajo WHERE id = $1 RETURNING id`, [id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ['PUT', 'DELETE']);
}

export default requireAuth(handler);
