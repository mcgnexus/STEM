import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return send(res, 400, { error: 'id inválido' });
  const sql = getDb();

  if (req.method === 'PUT') {
    const { origen, destino, km, coste_por_km, medio } = await readBody(req);
    const rows = await sql.query(
      `UPDATE desplazamientos SET
         origen = $1, destino = $2,
         km = COALESCE($3, km),
         coste_por_km = COALESCE($4, coste_por_km),
         medio = $5
       WHERE id = $6 RETURNING *`,
      [origen || null, destino || null, km ?? null, coste_por_km ?? null, medio || null, id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    const rows = await sql.query(
      `DELETE FROM desplazamientos WHERE id = $1 RETURNING id`, [id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ['PUT', 'DELETE']);
}

export default requireAuth(handler);
