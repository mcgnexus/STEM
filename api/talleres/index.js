import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res, { user }) {
  const sql = getDb();

  if (req.method === 'GET') {
    const rows = await sql.query(
      `SELECT t.*, c.nombre AS centro_nombre, u.nombre AS monitor_nombre
       FROM talleres t
       LEFT JOIN centros_educativos c ON c.id = t.centro_id
       LEFT JOIN usuarios u ON u.id = t.monitor_id
       ORDER BY t.fecha DESC NULLS LAST, t.id DESC`
    );
    return send(res, 200, rows);
  }

  if (req.method === 'POST') {
    const { centro_id, nombre, tipo, fecha, duracion_horas, ubicacion, monitor_id } =
      await readBody(req);
    if (!nombre) return send(res, 400, { error: 'El nombre es obligatorio' });

    const rows = await sql.query(
      `INSERT INTO talleres
         (centro_id, nombre, tipo, fecha, duracion_horas, ubicacion, monitor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        centro_id || null,
        nombre.trim(),
        tipo === 'especial' ? 'especial' : 'regular',
        fecha || null,
        duracion_horas || 0,
        ubicacion || null,
        monitor_id || user.sub,
      ]
    );
    return send(res, 201, rows[0]);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default requireAuth(handler);
