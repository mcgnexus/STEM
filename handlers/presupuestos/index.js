import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';

const TOTALS_SQL = `
  SELECT
    COALESCE((SELECT SUM(subtotal) FROM materiales       WHERE taller_id = $1), 0) AS total_materiales,
    COALESCE((SELECT SUM(subtotal) FROM desplazamientos   WHERE taller_id = $1), 0) AS total_desplazamientos,
    COALESCE((SELECT SUM(subtotal) FROM horas_trabajo     WHERE taller_id = $1), 0) AS total_horas
`;

export async function computeBudget(sql, tallerId) {
  const rows = await sql.query(TOTALS_SQL, [tallerId]);
  const t = rows[0];
  const totalGeneral =
    Number(t.total_materiales) + Number(t.total_desplazamientos) + Number(t.total_horas);

  const estadoRows = await sql.query(
    `SELECT estado FROM presupuestos WHERE taller_id = $1`, [tallerId]
  );

  return {
    taller_id: tallerId,
    total_materiales: Number(t.total_materiales),
    total_desplazamientos: Number(t.total_desplazamientos),
    total_horas: Number(t.total_horas),
    total_general: Number(totalGeneral.toFixed(2)),
    estado: estadoRows[0]?.estado || 'borrador',
  };
}

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    const tallerId = Number(req.query.taller_id);
    if (!Number.isInteger(tallerId)) {
      return send(res, 400, { error: 'taller_id es obligatorio' });
    }
    return send(res, 200, await computeBudget(sql, tallerId));
  }

  if (req.method === 'POST') {
    const { taller_id, estado } = await readBody(req);
    const tallerId = Number(taller_id);
    if (!Number.isInteger(tallerId)) {
      return send(res, 400, { error: 'taller_id es obligatorio' });
    }
    const budget = await computeBudget(sql, tallerId);
    const finalEstado = ['borrador', 'enviado', 'aprobado'].includes(estado)
      ? estado
      : budget.estado;

    await sql.query(
      `INSERT INTO presupuestos
         (taller_id, total_materiales, total_desplazamientos, total_horas, total_general, estado, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (taller_id) DO UPDATE SET
         total_materiales = EXCLUDED.total_materiales,
         total_desplazamientos = EXCLUDED.total_desplazamientos,
         total_horas = EXCLUDED.total_horas,
         total_general = EXCLUDED.total_general,
         estado = EXCLUDED.estado,
         actualizado_en = now()`,
      [
        tallerId,
        budget.total_materiales,
        budget.total_desplazamientos,
        budget.total_horas,
        budget.total_general,
        finalEstado,
      ]
    );

    return send(res, 200, { ...budget, estado: finalEstado });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default requireAuth(handler);
