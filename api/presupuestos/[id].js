import { getDb } from '../../lib/db.js';
import { requireAuth, send, readBody, methodNotAllowed } from '../../lib/http.js';
import { computeBudget } from './index.js';

async function handler(req, res) {
  const tallerId = Number(req.query.id);
  if (!Number.isInteger(tallerId)) return send(res, 400, { error: 'id inválido' });
  const sql = getDb();

  if (req.method === 'GET') {
    return send(res, 200, await computeBudget(sql, tallerId));
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { estado } = await readBody(req);
    if (!['borrador', 'enviado', 'aprobado'].includes(estado)) {
      return send(res, 400, { error: 'estado inválido' });
    }
    const budget = await computeBudget(sql, tallerId);

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
        estado,
      ]
    );

    return send(res, 200, { ...budget, estado });
  }

  return methodNotAllowed(res, ['GET', 'PATCH']);
}

export default requireAuth(handler);
