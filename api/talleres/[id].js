import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return send(res, 400, { error: 'id inválido' });
  const sql = getDb();

  if (req.method === 'GET') {
    const rows = await sql.query(
      `SELECT t.*, c.nombre AS centro_nombre, u.nombre AS monitor_nombre
       FROM talleres t
       LEFT JOIN centros_educativos c ON c.id = t.centro_id
       LEFT JOIN usuarios u ON u.id = t.monitor_id
       WHERE t.id = $1`,
      [id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'PUT') {
    const { centro_id, nombre, tipo, fecha, duracion_horas, ubicacion, monitor_id } =
      await readBody(req);
    const rows = await sql.query(
      `UPDATE talleres SET
         centro_id = $1,
         nombre = COALESCE($2, nombre),
         tipo = COALESCE($3, tipo),
         fecha = $4,
         duracion_horas = COALESCE($5, duracion_horas),
         ubicacion = $6,
         monitor_id = $7
       WHERE id = $8 RETURNING *`,
      [
        centro_id || null,
        nombre || null,
        tipo === 'especial' || tipo === 'regular' ? tipo : null,
        fecha || null,
        duracion_horas ?? null,
        ubicacion || null,
        monitor_id || null,
        id,
      ]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    const rows = await sql.query(`DELETE FROM talleres WHERE id = $1 RETURNING id`, [id]);
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
}

export default requireAuth(handler);
