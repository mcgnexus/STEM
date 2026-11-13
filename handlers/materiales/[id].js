import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return send(res, 400, { error: 'id inválido' });
  const sql = getDb();

  if (req.method === 'PUT') {
    const { item, cantidad, precio_unitario, proveedor } = await readBody(req);
    const rows = await sql.query(
      `UPDATE materiales SET
         item = COALESCE($1, item),
         cantidad = COALESCE($2, cantidad),
         precio_unitario = COALESCE($3, precio_unitario),
         proveedor = $4
       WHERE id = $5 RETURNING *`,
      [item || null, cantidad ?? null, precio_unitario ?? null, proveedor || null, id]
    );
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    const rows = await sql.query(`DELETE FROM materiales WHERE id = $1 RETURNING id`, [id]);
    if (!rows[0]) return send(res, 404, { error: 'No encontrado' });
    return send(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ['PUT', 'DELETE']);
}

export default requireAuth(handler);
